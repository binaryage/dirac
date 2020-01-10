(ns dirac.main.actions.launch
  (:require [clojure.tools.logging :as log]
            [dirac.home.chromium :as chromium]
            [dirac.main.terminal :as terminal]
            [dirac.home.helpers :as helpers]
            [dirac.main.playground :as playground]
            [dirac.main.utils :as utils]
            [dirac.home.chromium.mapping :as m]
            [dirac.home.releases :as releases]
            [me.raynes.conch.low-level :as conch]
            [progrock.core :as progrock]
            [dirac.home.defaults :as defaults]
            [dirac.home.locations :as locations]
            [clojure.java.io :as io]))

(defn locate-chromium-via-link [config]
  (log/debug "Locating Chromium via a link...")
  (let [{:keys [executable failure :as resolution]} (chromium/resolve-chromium-link)]
    (if (some? executable)
      (do
        (log/info (str "Located Chromium executable via link which resolved to '" (terminal/style-path executable) "'."))
        executable)
      (throw (ex-info (str "Unable to resolve Chromium link\n"
                           "Reason: " failure "\n"
                           "=> " defaults/chromium-location-faq-url)
                      {:resolution resolution
                       :config     config})))))

(defn locate-chromium-by-search [config]
  (log/debug "Locating Chromium by search...")
  (if-some [executable (chromium/find-chrome-executable)]
    (do
      (log/info (str "Located Chromium executable at '" (terminal/style-path executable) "'."))
      executable)
    (throw (ex-info (str "Unable to locate Chromium executable\n"
                         "=> " defaults/chromium-location-faq-url)
                    {:config config}))))

(defn locate-chromium [config]
  (if (chromium/chromium-link-exists?)
    (locate-chromium-via-link config)
    (locate-chromium-by-search config)))

(defn determine-chromium-version* [config chromium-executable]
  (if-let [chromium-version (:chromium-version config)]
    (do
      (log/debug "Chromium version is force via config")
      chromium-version)
    (do
      (log/debug "Reading Chromium version...")
      (let [chromium-version (chromium/determine-chrome-version chromium-executable)]
        (log/trace (utils/pp chromium-version))
        (when (some? (:error chromium-version))
          (throw (ex-info (str "Failed to detect Chromium version\n" (:error-message chromium-version))
                          {:chromium-executable chromium-executable})))
        (:version chromium-version)))))

(defn determine-chromium-version [config chromium-executable]
  (let [version (determine-chromium-version* config chromium-executable)]
    (log/info (str "Detected Chromium version '" (terminal/style-version version) "'"))
    version))

(defn config-aware-progress-printer [config & args]
  (let [{:keys [verbosity]} config]
    (when (> verbosity 0)
      (apply progrock/print args))))

(defn make-progress-reporter
  ([] (make-progress-reporter progrock/print))
  ([printer]
   (let [progress-bar-atom (atom (progrock/progress-bar 0))]
     (fn [progress & [total]]
       (if (= progress :done)
         (printer (swap! progress-bar-atom progrock/done))
         (if (pos-int? total)
           (printer (swap! progress-bar-atom assoc :progress progress :total total))))))))

(defn retrieve-dirac-release! [config dirac-version]
  (let [dirac-version-dir-path (releases/get-version-dir-path dirac-version)]
    (log/info (str "Resolved matching Dirac release as '" (terminal/style-version dirac-version) "'"))
    (when-not (releases/release-downloaded? dirac-version)
      (let [release-url (releases/get-release-url dirac-version)
            progress-printer (make-progress-reporter (partial config-aware-progress-printer config))]
        (log/info (str "Downloading Dirac release from '" (terminal/style-url release-url) "'"))
        (releases/retrieve-release! dirac-version progress-printer)))
    (log/info (str "Matching Dirac release is located at '" (terminal/style-path dirac-version-dir-path) "'"))
    dirac-version-dir-path))

(defn retrieve-local-dirac! [_config path]
  (if (.exists (io/file path))
    (do
      (log/info (str "Matching Dirac release is located at '" (terminal/style-path path) "'"))
      path)
    (throw (ex-info (str "Local Dirac release at '" path "' does not exist.") {:path path}))))

(defn prepare-dirac-release-dir! [config chromium-version]
  (let [{:keys [releases releases-url]} config
        releases-url (or releases-url
                         defaults/releases-file-url)
        releases-file (or (helpers/absolutize-path (locations/get-home-dir-path) releases)
                          (locations/get-releases-file-path))
        _ (log/debug (str "Using releases file from '" (terminal/style-path releases-file) "'"))
        release-descriptor (if (some? releases)
                             (chromium/resolve-dirac-release! chromium-version releases-file)                                 ; do not check online for updates
                             (chromium/resolve-dirac-release! chromium-version releases-url releases-file))]
    (case (:result release-descriptor)
      :release (retrieve-dirac-release! config (:version release-descriptor))
      :local (retrieve-local-dirac! config (:path release-descriptor)))))

(defn launch-chromium! [config chromium-executable dirac-version-dir chromium-data-dir]
  (let [frontend-dir (releases/get-devtools-frontend-dir-path dirac-version-dir)
        convenience-args ["--no-first-run"]
        verbosity-args (if (= (:verbosity config) "ALL") ["--enable-logging=stderr" "--v=1"])
        custom-devtools [(str "--custom-devtools-frontend=" "file://" frontend-dir)]
        devtools-experiments ["--enable-devtools-experiments"]
        data-dir (if (some? chromium-data-dir) [(str "--user-data-dir=" chromium-data-dir)])
        extra-args (chromium/read-chromium-extra-args)
        args (concat convenience-args verbosity-args custom-devtools data-dir devtools-experiments extra-args)
        profile (if (some? chromium-data-dir) (str "[with --user-data-dir='" (terminal/style-path chromium-data-dir) "'] "))]
    (log/info (str "Launching Chromium " profile "..."))
    (log/debug (str "Spawning a sub-process '" chromium-executable "' with args:\n" (utils/pp args)))
    (let [conch-process (apply conch/proc chromium-executable args)
          unix-process (:process conch-process)]
      (log/debug (str "Chromium process: " unix-process))
      (future (conch/stream-to conch-process :out (System/out)))
      (future (conch/stream-to conch-process :err (System/err)))
      (log/debug "Waiting for Chromium to exit...")
      (let [exit-status (conch/exit-code conch-process)]
        (log/debug (str "Chromium exited with status " exit-status))
        exit-status))))

(defn prepare-chromium-data-dir! [config]
  (if (or (true? (:no-profile config)) (nil? (:profile config)))
    (log/debug "Not using specific Chromium data dir")
    (let [profile-dir-path (chromium/get-chromium-profile-dir-path (:profile config))]
      (log/debug (str "Using Chromium data dir '" (terminal/style-path profile-dir-path) "'"))
      (helpers/ensure-dir! profile-dir-path)
      profile-dir-path)))

(defn launch-playground! [config]
  (try
    (let [playground-dir-path (locations/get-playground-dir-path)]
      (log/info (str "Preparing playground environment at '" (terminal/style-path playground-dir-path) "'"))
      (playground/start-playground! playground-dir-path config))
    (catch Throwable e
      (log/error "launch-playground! unexpectedly exited" e)
      (throw e))))

(defn launch!
  "Launch Chromium with matching Dirac release:

     1. locate Chromium binary on user's machine
     2. detect Chromium version
     3. download/prepare matching Dirac release
     4. prepare playground REPL environment with Dirac runtime
     5. launch Chromium with proper commandline flags, most notably --custom-devtools-frontend
  "
  [config]
  (let [chromium-executable (locate-chromium config)
        chromium-version (determine-chromium-version config chromium-executable)
        chromium-data-dir (prepare-chromium-data-dir! config)
        dirac-version-dir (prepare-dirac-release-dir! config chromium-version)]
    (launch-playground! config)
    (Thread/sleep 2000)                                                                                                       ; give Dirac Agent and nREPL server some time to boot up
    (launch-chromium! config chromium-executable dirac-version-dir chromium-data-dir)))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (locate-chromium {})
  (binding [m/*mock-releases* {:chromium {"81.0.4010" "1.4.6"}}]
    (launch! {}))
  (binding [m/*mock-releases* {:chromium {"81.0.4010" {:result :local
                                                       :path   "/some/non/existent/path"}}}]
    (launch! {}))
  (binding [m/*mock-releases* {:chromium {"81.0.4010" {:result :local
                                                       :path   "/tmp"}}}]
    (launch! {}))

  )
