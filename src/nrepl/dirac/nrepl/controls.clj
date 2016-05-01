(ns dirac.nrepl.controls
  (:require [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :refer [with-err-output get-nrepl-agent-string]]))

; this namespace defines context where special dirac commands are eval'd

; we are forgiving when reading the command argument,
; it gets converted to keyword so all following variations are permitted:
;
;   (dirac! :help)
;   (dirac! 'help)
;   (dirac! "help")
;
(defmulti dirac! (fn [command & _args] (keyword command)))

; -- special REPL commands --------------------------------------------------------------------------------------------------

; note: we want to be forgiving when user passes extra parameters we don't care about
; unfortunately stack traces from eval are cryptic and could confuse some people
; TODO: find a way how to validate parameters in a user-friendly way

(def help-string
  "TODO: write some docs")

(defmethod dirac! :help [_ & _]
  (let [help (str (get-nrepl-agent-string) ".\n"
                  help-string)]
    (println help))
  ::no-result)

(defmethod dirac! :status [_ & _]
  (let [session (sessions/get-current-session)
        session-type (cond
                       (sessions/in-cljs-repl? session)
                       (str "a ClojureScript session.\n"
                            "The session is connected to '" (sessions/get-user-friendly-session-descriptor-tag session) "'")

                       (sessions/has-joined-session? session)
                       (str "a joined ClojureScript session.\n"
                            "The target session is connected to '...'")                                                       ; TODO:

                       :else
                       (str "a normal Clojure session"))
        status (str (get-nrepl-agent-string) ".\n"
                    "Your current nREPL session is " session-type ".")]
    (println status))
  ::no-result)

(defmethod dirac! :default [command & _]
  (let [error-message (str "Unrecognized Dirac command '" command "', "
                           "execute '(dirac! :help)' to see a list of available commands.")]
    (with-err-output
      (println error-message)))
  ::no-result)