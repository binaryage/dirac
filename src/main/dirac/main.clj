(ns dirac.main
  (:require [clojure.tools.logging :as log]
            [dirac.main.cli :as cli]
            [dirac.main.actions :as actions]
            [dirac.main.logging :as logging]
            [dirac.main.utils :as utils]
            [dirac.main.terminal :as terminal])
  (:gen-class))

(defn exit! [config]
  (when-some [message (:message config)]
    (println message))
  (System/exit (or (:exit-status config) 0)))

; -- main entry point -------------------------------------------------------------------------------------------------------

(defn -main [& args]
  (let [config (cli/parse-cli-args args)]
    (terminal/setup! config)
    (logging/setup! config)
    (log/trace (str "Using ANSI:" (pr-str (terminal/using-ansi?))))
    (log/debug (str "CLI config:\n" (utils/pp config)))
    (let [exit-code (case (:command config)
                      :exit (exit! config)
                      :launch (actions/launch! config)
                      :nuke (actions/nuke! config)
                      (throw (ex-info "Unexpected command" config)))]
      (System/exit (or exit-code 0)))))
