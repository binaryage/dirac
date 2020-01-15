(ns dirac.home.chromium.scout
  "This is a small library for locating Google Chrome Canary executable on user's machine.
  We use this in dirac.main to locate Chrome to be launched on user's behalf.

  We want to do something like:
    https://github.com/binaryage/dirac/blob/devtools/scripts/hosted_mode/launch_chrome.js
    https://cs.chromium.org/chromium/src/chrome/test/chromedriver/chrome/chrome_finder.cc"
  (:require [clojure.java.shell :refer [sh]]
            [clojure.string :as string]
            [dirac.home.helpers :as helpers]
            [clojure.java.io :as io]
            [dirac.home.defaults :as defaults]
            [dirac.home.locations :as locations]))

(defn resolve-os-name []
  (string/lower-case (helpers/system-get-property "os.name")))

(defn is-mac? [os-name]
  (some? (string/index-of os-name "mac os")))

(defn is-win? [os-name]
  (some? (string/index-of os-name "windows")))

(defn file-exists? [path]
  (.exists (io/file path)))

(defn pick-first-existing-file [candidates]
  (first (filter file-exists? candidates)))

(defn honor-chromium-path-from-env-if-exists []
  (if-some [chromium-path (helpers/system-get-env defaults/chromium-path-env-var)]
    (let [file (io/file chromium-path)]
      (if (.exists file)
        (locations/canonical-path chromium-path)))))

(defmulti search-for-chrome-executable (fn [strategy _opts] strategy))

(defmethod search-for-chrome-executable :mac-strategy [_ _opts]
  ; TODO: can be more sophisticated via lsregister, see https://github.com/binaryage/dirac/blob/devtools/scripts/hosted_mode/launch_chrome.js
  (pick-first-existing-file ["/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"]))

(defn compute-chromium-path-candidates-windows []
  (let [prefixes (keep helpers/system-get-env defaults/windows-app-locations-env-vars)
        suffixes ["\\Google\\Chrome SxS\\Application\\chrome.exe"]]
    (for [prefix prefixes
          suffix suffixes]
      (str prefix suffix))))

(defmethod search-for-chrome-executable :win-strategy [_ _opts]
  (pick-first-existing-file (compute-chromium-path-candidates-windows)))

(defn compute-chromium-path-candidates-unix []
  ; TODO: also see https://cs.chromium.org/chromium/src/chrome/test/chromedriver/chrome/chrome_finder.cc
  (let [prefixes ["/usr/local/sbin"
                  "/usr/local/bin"
                  "/usr/sbin"
                  "/usr/bin"
                  "/sbin"
                  "/bin"
                  "/opt/google/chrome"
                  "/opt/chromium.org/chromium"]
        suffixes ["chromium-browser"
                  "chromium"]]
    (for [prefix prefixes
          suffix suffixes]
      (str prefix "/" suffix))))

(defmethod search-for-chrome-executable :unix-strategy [_ _opts]
  (pick-first-existing-file (compute-chromium-path-candidates-unix)))

(defn pick-strategy-for-os [os-name]
  (cond
    (is-mac? os-name) :mac-strategy
    (is-win? os-name) :win-strategy
    :default :unix-strategy))

(def chrome-version-string-re #"([a-zA-Z ]+?)?\s?([0-9\.]+)\s?(.*)?")

(defn parse-chrome-version-string
  "Version string should look like 'Google Chrome 80.0.3968.0 canary'
  Returns {:version \"80.0.3968.0\", :prefix \"Google Chrome\", :postfix \"canary\"}"
  [version-string]
  (when-some [[_ prefix version postfix] (re-matches chrome-version-string-re version-string)]
    (helpers/erase-blank-vals {:prefix  prefix
                               :version version
                               :postfix postfix})))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn find-chrome-executable
  ([] (find-chrome-executable {}))
  ([opts]
   (or (honor-chromium-path-from-env-if-exists)
       (let [strategy (or (:strategy opts) (pick-strategy-for-os (resolve-os-name)))]
         (search-for-chrome-executable strategy opts)))))

(defn determine-chrome-version [executable-path]
  ; TODO: this approach does not work under Windows
  ; issue: https://bugs.chromium.org/p/chromium/issues/detail?id=158372
  (try
    (let [command [executable-path "--version"]
          {:keys [exit out err]} (apply sh command)
          trimmed-err (string/trim err)
          trimmed-out (string/trim out)]
      (if (zero? exit)
        (if-some [result (parse-chrome-version-string trimmed-out)]
          result
          {:error         :version-parsing
           :error-message "Unable to determine Chrome version from '" trimmed-out "'."})
        {:error         :exit-status
         :error-message (str "Unable to run ' " (pr-str command) "', exited with status " exit "."
                             (if-not (string/blank? trimmed-err) (str "\n" trimmed-err)))}))
    (catch Exception e
      {:error         :exception
       :error-message (.getMessage e)})))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (resolve-os-name)
  (find-chrome-executable)
  (binding [helpers/*system-get-env-impl* (fn [name]
                                            (case name
                                              "LOCALAPPDATA" "\\LOCALAPPDATA"
                                              "PROGRAMFILES(X86)" "\\PROGRAMFILESX86"
                                              nil))]
    (doall (compute-chromium-path-candidates-windows)))
  (compute-chromium-path-candidates-unix)

  (parse-chrome-version-string "Google Chrome 80.0.3968.0 canary")
  (parse-chrome-version-string "Google Chrome 80.0.3968.0")
  (parse-chrome-version-string "Something 80.0.3968.0")
  (parse-chrome-version-string "80.0.3968.0")

  (determine-chrome-version "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary")
  (determine-chrome-version (find-chrome-executable {}))
  )
