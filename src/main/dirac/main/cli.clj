(ns dirac.main.cli
  (:require [clojure.string :as string]
            [clojure.tools.cli :as tools-cli]
            [clj-sub-command.core :refer [parse-cmds]]))

(def cli-name "dirac")
(def cli-version "1.5.1")
(def cli-description "A command-line tool for Dirac DevTools.")

; -- options ----------------------------------------------------------------------------------------------------------------

(def global-options
  [["-v" nil "Verbosity level; may be specified multiple times to increase value"
    :id :verbosity
    :default 1
    :assoc-fn (fn [m k _] (update-in m [k] inc))]
   [nil "--quiet" "Run quietly"]
   [nil "--no-color" "Force disabling ANSI colored output"]
   [nil "--force-color" "Force enabling ANSI colored output"]
   ["-h" "--help"]
   ])

(def launch-options
  [[nil "--profile NAME" "Specify Chromium data dir" :default "default"]
   [nil "--no-profile" "Don't specify any Chromium data dir"]
   [nil "--releases PATH" "Force alternative releases.edn file, do not check for updates"]
   [nil "--releases-url URL" "Force alternative releases.edn url"]])

(def nuke-options
  [[nil "--confirm" "Force require confirmation"]])

(def commands
  [["help" "Show usage info"]
   ["launch" "Launch Chromium with Dirac"]
   ["nuke" "Reset Dirac into factory-defaults (delete home dir)"]])

(def default-command "launch")

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn usage-header []
  (str "Dirac " cli-version "\n"
       cli-description "\n"))

(defn usage [options-summary commands-summary & [note]]
  (let [lines [(if (some? note) (str note "\n"))
               (usage-header)
               (str "Usage: " cli-name " [options] [command] [...]")
               ""
               "Options:"
               options-summary
               ""
               "Commands:"
               commands-summary
               ""
               (str "Run `" cli-name " help <command>` for further info.")
               ""]]
    (string/join \newline (keep identity lines))))

(defn command-usage [command options-summary text & [note]]
  (let [lines [(if (some? note) (str note "\n"))
               (usage-header)
               (str "Usage: " cli-name " [...] " command " [options]")
               ""
               "Options:"
               options-summary
               ""
               text
               ""
               (str "Run `" cli-name " help` for general info.")]]
    (string/join \newline (keep identity lines))))

(defn error-msg [errors]
  (str "The following errors occurred while parsing your command:\n\n"
       (string/join \newline errors)))

(defn command-error-msg [command errors]
  (str "The following errors occurred while parsing your '" command "' command:\n\n"
       (string/join \newline errors)))

(defn want-exit [status msg]
  {:command     :exit
   :message     msg
   :exit-status status})

; -- config conversion ------------------------------------------------------------------------------------------------------

(defn verbosity->log-level [verbosity]
  (case verbosity
    1 "INFO"
    2 "DEBUG"
    3 "TRACE"
    "ALL"))

(defn postprocess-options [options]
  (if (= (:command options) :exit)
    options
    (cond-> options
            true (assoc :log-level (verbosity->log-level (:verbosity options)))
            (:quiet options) (assoc :verbosity 0 :log-level "OFF"))))

; -- launch -----------------------------------------------------------------------------------------------------------------

(def help-launch
  ["Launch Chromium with matching Dirac release:"
   "  1. locate Chromium binary on user's machine"
   "  2. detect Chromium version"
   "  3. download/prepare matching Dirac release"
   "  4. launch Chromium with proper commandline flags, most notably --custom-devtools-frontend"])

(defn usage-launch []
  (let [{:keys [summary]} (tools-cli/parse-opts [] launch-options)]
    (want-exit 0 (command-usage "launch" summary (string/join \newline help-launch)))))

(defn parse-launch [args global-options]
  (let [{:keys [options errors]} (tools-cli/parse-opts args launch-options)]
    (if (some? errors)
      (want-exit 1 (command-error-msg "launch" errors))
      (merge global-options options))))

; -- nuke -------------------------------------------------------------------------------------------------------------------

(def help-nuke
  ["Reset Dirac into factory defaults:"
   "  1. delete Dirac HOME directory"])

(defn usage-nuke []
  (let [{:keys [summary]} (tools-cli/parse-opts [] nuke-options)]
    (want-exit 0 (command-usage "nuke" summary (string/join \newline help-nuke)))))

(defn parse-nuke [args global-options]
  (let [{:keys [options errors]} (tools-cli/parse-opts args nuke-options)]
    (if (some? errors)
      (want-exit 1 (command-error-msg "nuke" errors))
      (merge global-options options))))

; -- help -------------------------------------------------------------------------------------------------------------------

(defn usage-help [main-usage-fn]
  (want-exit 0 (main-usage-fn)))

(defn parse-help [args _options main-usage-fn]
  (let [topic (or (first args) "help")]
    (case topic
      "launch" (usage-launch)
      "nuke" (usage-nuke)
      "help" (usage-help main-usage-fn)
      (want-exit 0 (main-usage-fn (str "Unknown help topic '" topic "'"))))))

; -- top parser -------------------------------------------------------------------------------------------------------------

(defn massage-errors [errors]
  (if (some? errors)
    ; this is ugly, but we want to support default case without any command, clj-sub-command doesn't seem to support that
    (if (string/index-of (first errors) "Unknown command: \"\"")
      nil
      errors)))

(defn parse-globals [args]
  (let [{:keys [options command arguments errors options-summary commands-summary]} (parse-cmds args global-options commands)
        display-usage (fn [& args] (apply usage options-summary commands-summary args))
        effective-errors (massage-errors errors)
        effective-command (keyword (or command default-command))
        effective-options (assoc options :command effective-command)]
    (cond
      (some? effective-errors) (want-exit 1 (error-msg effective-errors))
      (true? (:help effective-options)) (want-exit 0 (display-usage))
      :else (case effective-command
              :launch (parse-launch arguments effective-options)
              :nuke (parse-nuke arguments effective-options)
              :help (parse-help arguments effective-options display-usage)))))

; -- api --------------------------------------------------------------------------------------------------------------------

(defn parse-cli-args [args]
  (postprocess-options (parse-globals args)))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (parse-cli-args ["help"])
  (parse-cli-args ["-h"])
  (parse-cli-args ["help" "x"])
  (parse-cli-args ["help" "launch"])
  (parse-cli-args ["help" "nuke"])
  (parse-cli-args ["launch" "--xyz" "1"])
  (parse-cli-args ["launch" "--releases" "/tmp/path"])
  (parse-cli-args ["-v" "launch"])
  (parse-cli-args ["-vv" "launch"])
  (parse-cli-args ["-vvv" "launch"])
  (parse-cli-args ["-vvvv" "launch"])
  (parse-cli-args [])
  (parse-cli-args ["x"])
  (parse-cli-args ["x" "y"]))
