(ns dirac.nrepl.controls
  (:require [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :refer [with-err-output get-nrepl-info error-println]]
            [clojure.string :as string])
  (:import (java.util.regex Pattern)))

; note: this namespace defines the context where special dirac commands are eval'd

; -- usage docs -------------------------------------------------------------------------------------------------------------

(def ^:dynamic general-usage
  ["Dirac provides a command-line-like interface for controlling Dirac REPL operations."
   "A special REPL function 'dirac!' was made available by the Dirac Middleware."
   "You invoke it from your nREPL session by evaluating a form:"
   ""
   "  (dirac! <command> [arg1] [arg2] ...)"
   ""
   "Dirac <command> is a keyword followed by optional arguments."
   ""
   "A list of known commands:"
   ""
   "  :status  -> prints current session state"
   "  :ls      -> list available Dirac sessions"
   "  :join    -> join a Dirac session"
   "  :disjoin -> disjoin Dirac session"
   "  :match   -> list matching Dirac sessions"
   "  :version -> print version info"
   "  :help    -> print usage help"
   ""
   "For more information use (dirac! :help <command>)."])

(def ^:dynamic help-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :help)"
   "  2. (dirac! :help <command>)"
   ""
   "Print general usage help(1) or specific command usage help(2)."])

(def ^:dynamic version-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :version)"
   ""
   "Print version info(1)."])

(def ^:dynamic status-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :status)"
   ""
   "Print status of current nREPL session."])

(def ^:dynamic ls-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :ls)"
   ""
   "Print list of all currently available Dirac sessions."
   "They are listed in historical order."])

(def ^:dynamic join-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :join <number>)"
   "  2. (dirac! :join <string>)"
   "  3. (dirac! :join <regex>)"
   "  4. (dirac! :join)"
   ""
   "Join or re-join a Dirac session which matches provided matcher."
   "Joined session will forward all eval requests to the first matched Dirac session."
   "To list all available Dirac sessions use (dirac! :ls)."
   "Matching is done dynamically for every new eval request. Dirac sessions are tested in historical order."
   "Matcher must be either a number(1), a string(2), a regex(3) or omitted(4)."
   "Number-based matching joins nth session from the list."
   "String matching tests for a matching tag substring."
   "Regex matches tags with provided regular expression."
   "If no matcher is provided, this session will join the most recent Dirac session in the list."
   ""
   "Note: Dirac sessions are created and destroyed with browser reloads. That is why it is important to have"
   "      a dynamic matching system in place for stable joining experience. String or regex matching is recommended."
   "      In case there is no matching Dirac session available, we will warn you and evaluation will result in a no-op."])

(def ^:dynamic disjoin-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :disjoin)"
   ""
   "Disjoins previously joined Dirac session."
   "Future eval requests will be executed in the context of a normal Clojure session."])

(def ^:dynamic match-usage
  ["Usage forms:"
   ""
   "  1. (dirac! :match)"
   ""
   "Lists matching Dirac sessions for this (joined) session."
   "This command is available for testing purposed for finetuning your match substring or regexp."
   "The first session in the list would be used for evaluation requests."])

(def ^:dynamic docs
  {:help    help-usage
   :version version-usage
   :status  status-usage
   :ls      ls-usage
   :join    join-usage
   :disjoin disjoin-usage
   :match   match-usage})

(defn render-usage [lines]
  (string/join "\n" lines))

; -- error messages ---------------------------------------------------------------------------------------------------------

(defn ^:dynamic no-such-command-msg [command]
  (str "No such command '" command "'.\n"
       "Execute (dirac! :help) for a list of available commands."))

(defn ^:dynamic invalid-matcher-msg [matcher]
  (str "Invalid matcher provided. Matcher must be either a number, a string, a regex or omitted.\n"
       "Your matcher '" matcher "' is of type " (type matcher)))

(defn ^:dynamic cannot-disjoin-dirac-session-msg []
  (str "Your session is a Dirac session. Cannot disjoin this type of session."))

(defn ^:dynamic cannot-disjoin-clojure-session-msg []
  (str "Your session is not joined to any Dirac session. Nothing to do."))

(defn ^:dynamic session-disjoined-msg []
  (str "Your session was disjoined from a Dirac session. Now you are back in a normal Clojure session."))

(defn ^:dynamic cannot-match-dirac-session-msg []
  (str "Your session is a Dirac session. This type of session cannot join any other Dirac sessions."))

(defn ^:dynamic cannot-match-clojure-session-msg []
  (str "Your session is not joined to any Dirac session. No Dirac session will match."))

(defn ^:dynamic no-matching-dirac-sessions-msg [matcher-description]
  (str "No Dirac sessions were matched for current target session matcher \"" matcher-description "\"."))

(defn ^:dynamic list-matching-dirac-sessions-msg [matcher-description tags]
  (let [printer (fn [i tag]
                  (str (if (zero? i) "  * " "    ") tag))]
    (str "Following Dirac sessions were matched for current target session matcher \"" matcher-description "\"\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic no-dirac-sessions-msg []
  (str "No Dirac sessions are currently available. Connect at least one Dirac REPL to the nREPL server."))

(defn ^:dynamic list-dirac-sessions-msg [tags]
  (let [printer (fn [i tag]
                  (str "  #" (inc i) ": " tag))]
    (str "List of all Dirac sessions currently connected to the nREPL server:\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic default-error-msg [command]
  (str "Unrecognized Dirac command '" command "'\n"
       "Execute '(dirac! :help)' to see a list of available commands."))

; == special REPL commands ==================================================================================================

; we are forgiving when reading the command argument,
; it gets converted to keyword so all following variations are permitted:
;
;   (dirac! :help)
;   (dirac! 'help)
;   (dirac! "help")
;
(defmulti dirac! (fn [command & _args] (keyword command)))

; note: we want to be forgiving when user passes extra parameters we don't care about
; unfortunately stack traces from eval are cryptic and could confuse some people

; -- (dirac! :help) ---------------------------------------------------------------------------------------------------------

(defmethod dirac! :help [_ & [command]]
  (if-not command
    (println (render-usage general-usage))
    (if-let [doc (get docs (keyword command))]
      (println (render-usage doc))
      (error-println (no-such-command-msg command))))
  ::no-result)

; -- (dirac! :version) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :version [_ & _]
  (println (str (get-nrepl-info) "."))
  ::no-result)

; -- (dirac! :status) -------------------------------------------------------------------------------------------------------

(defmethod dirac! :status [_ & _]
  (let [session (sessions/get-current-session)
        session-type (sessions/get-session-type session)]
    (println (str "Your current nREPL session is " session-type ".")))
  ::no-result)

; -- (dirac! :ls) -----------------------------------------------------------------------------------------------------------

(defmethod dirac! :ls [_ & _]
  (let [tags (sessions/get-user-friendly-session-tags)]
    (if (empty? tags)
      (println (no-dirac-sessions-msg))
      (println (list-dirac-sessions-msg tags))))
  ::no-result)

; -- (dirac! :join) ---------------------------------------------------------------------------------------------------------

(defmethod dirac! :join [_ & [matcher]]
  (let [session (sessions/get-current-session)
        test-match (fn [& _] (dirac! :match))]
    (cond
      (nil? matcher) (test-match (sessions/join-session-with-most-recent-matcher! session))
      (number? matcher) (test-match (sessions/join-session-with-number-matcher! session matcher))
      (string? matcher) (test-match (sessions/join-session-with-substr-matcher! session matcher))
      (instance? Pattern matcher) (test-match (sessions/join-session-with-regex-matcher! session matcher))
      :else (error-println (invalid-matcher-msg matcher))))
  ::no-result)

; -- (dirac! :disjoin) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :disjoin [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (cannot-disjoin-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (cannot-disjoin-clojure-session-msg))
      :else (do
              (sessions/disjoin-session! session)
              (println (session-disjoined-msg)))))
  ::no-result)

; -- (dirac! :match) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :match [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (cannot-match-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (cannot-match-clojure-session-msg))
      :else (let [description (sessions/get-joined-session-info session)
                  tags (sessions/list-matching-sessions-tags session)]
              (if (empty? tags)
                (println (no-matching-dirac-sessions-msg description))
                (println (list-matching-dirac-sessions-msg description tags))))))
  ::no-result)

; -- default handler --------------------------------------------------------------------------------------------------------

(defmethod dirac! :default [command & _]
  (error-println (default-error-msg command))
  ::no-result)