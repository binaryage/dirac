(ns dirac.agent-cli
  (:require [clojure.string :as string]
            [clojure.tools.cli :refer [parse-opts]]
            [dirac.agent :as agent])
  (:gen-class))

(def port-validator [#(< 0 % 0x10000) "Must be a number between 0 and 65536"])
(def port-parser #(Integer/parseInt %))

; -- options ----------------------------------------------------------------------------------------------------------------

(def cli-options
  [["-p" "--nrepl-tunnel-port PORT" "nREPL tunnel port (will listen)"
    :parse-fn port-parser
    :validate port-validator]
   ["-H" "--nrepl-tunnel-host HOST" "nREPL tunnel host (will bind)"
    :default-desc "localhost"]
   ["-q" "--nrepl-server-port PORT" "nREPL server port (will connect)"
    :parse-fn port-parser
    :validate port-validator]
   ["-I" "--nrepl-server-host HOST" "nREPL server host (will connect)"
    :default-desc "localhost"]
   ["-v" nil "Verbosity level; may be specified multiple times to increase value"
    :id :verbosity
    :default 0
    :assoc-fn (fn [m k _] (update-in m [k] inc))]
   ["-h" "--help"]])

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn usage [options-summary]
  (->> [(str "Dirac Agent connects to an existing nREPL server "
             "and acts as a proxy which provides nREPL connections"
             "to Dirac DevTools instances in the browser.")
        ""
        "Usage: dirac-agent [options] action"
        ""
        "Options:"
        options-summary
        ""
        "Actions:"
        "  start    Start a new Dirac Agent server"
        ""]
       (string/join \newline)))

(defn error-msg [errors]
  (str "The following errors occurred while parsing your command:\n\n"
       (string/join \newline errors)))

(defn exit [status msg]
  (println msg)
  (System/exit status))

; -- config conversion ------------------------------------------------------------------------------------------------------

(defn verbosity->log-level [verbosity]
  (case verbosity
    0 nil
    1 "INFO"
    2 "DEBUG"
    3 "TRACE"
    "ALL"))

(def config-mapping
  [[:nrepl-tunnel-port [:nrepl-tunnel :port]]
   [:nrepl-tunnel-host [:nrepl-tunnel :host]]
   [:nrepl-server-port [:nrepl-server :port]]
   [:nrepl-server-host [:nrepl-server :host]]
   [:verbosity [:log-level]]])

(defn apply-config-option [options config mapping]
  (let [[option config-path] mapping]
    (if-let [option-value (option options)]
      (assoc-in config config-path option-value)
      config)))

(defn map-config-options [options mapping]
  (reduce (partial apply-config-option options) {} mapping))

(defn options->config [options]
  (-> options
      (update :verbosity verbosity->log-level)
      (map-config-options config-mapping)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn -main [& args]
  (let [{:keys [options arguments errors summary]} (parse-opts args cli-options)]
    (cond
      (:help options) (exit 0 (usage summary))
      (not= (count arguments) 1) (exit 1 (usage summary))
      errors (exit 1 (error-msg errors)))
    (let [config (options->config options)]
      (case (first arguments)
        "start" (agent/boot! config)
        (exit 1 (usage summary))))))
