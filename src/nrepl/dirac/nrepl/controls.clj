(ns dirac.nrepl.controls
  (:require [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :refer [with-err-output get-nrepl-info error-println]]
            [clojure.string :as string])
  (:import (java.util.regex Pattern)))

; note: this namespace defines the context where special dirac commands are eval'd

; -- usage docs -------------------------------------------------------------------------------------------------------------

(def ^:dynamic general-usage
  ["Dirac provides a command-line interface to control its REPL operations."
   "A special REPL function `dirac!` was made available for you."
   "You may invoke it from any of your nREPL sessions by evaluating a form:"
   ""
   "  `(dirac! <command> [arg1] [arg2] [...])`"
   ""
   "Dirac <command> is a keyword followed by optional arguments."
   ""
   "A list of known commands:"
   ""
   "  :status  -> prints current session state"
   "  :ls      -> list available Dirac sessions"
   "  :join    -> join Dirac"
   "  :disjoin -> disjoin Dirac"
   "  :match   -> list matching Dirac sessions"
   "  :version -> print version info"
   "  :help    -> print usage help"
   ""
   "For more information use (dirac! :help <command>)."])

(def ^:dynamic help-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :help)`"
   "  2. `(dirac! :help <command>)`"
   ""
   "Print general usage help(1) or specific command usage help(2)."])

(def ^:dynamic version-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :version)`"
   ""
   "Print version info(1)."])

(def ^:dynamic status-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :status)`"
   ""
   "Print status(1) of current nREPL session."])

(def ^:dynamic ls-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :ls)`"
   ""
   "Print listing(1) of all currently connected Dirac sessions to this nREPL server."
   "They are listed in historical order as they connected."])

(def ^:dynamic join-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :join <number>)`"
   "  2. `(dirac! :join <string>)`"
   "  3. `(dirac! :join <regex>)`"
   "  4. `(dirac! :join)`"
   ""
   "Join or re-join first Dirac session matching provided matching strategy."
   "In other words: this Clojure nREPL session joins a specific target Dirac session."
   "When joined, this session will forward all incoming eval requests to the matched target Dirac session."
   ""
   "To list all available Dirac sessions use `(dirac! :ls)`."
   "Matching is done dynamically for every new eval request. Connected Dirac sessions are tested in historical order."
   "Matching strategy must be either a number(1), a string(2), a regex(3) or omitted(4)."
   "Number-based matching targets nth session from the list."
   "String-based matching targets first Dirac session matching the provided substring."
   "Regex-based matching targets first Dirac session matching the provided regular expression."
   "If no matching strategy is provided, this session will target the most recent Dirac session in the list."
   ""
   "Note: Dirac sessions are not persistent. They are created when Dirac DevTools instance opens a Console Panel and switches"
   "      console prompt to the Dirac REPL. Dirac sessions are destroyed when Dirac DevTools window gets closed."
   "      Dynamic matching helps us to keep stable targeting of a specific Dirac session even if DevTools app gets closed and"
   "      reopened. In case there is no matching target Dirac session available, we will warn you and evaluation will result"
   "      in a no-op. You may use `(dirac! :match)` command to test/troubleshoot your current matching strategy."])

(def ^:dynamic disjoin-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :disjoin)`"
   ""
   "Disjoins(1) previously joined Dirac session."
   "Future eval requests will be executed in the context of your original Clojure session."])

(def ^:dynamic match-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :match)`"
   ""
   "Lists matching(1) Dirac sessions for this session (according to current matching strategy set by :join)."
   "This command is available for testing purposes - for fine-tuning your matching substring or regexp."
   "The first session(*) in the list would be used as the target Dirac session for incoming evaluation requests."])

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
  (str "Invalid matching strategy provided. It must be either a number, a string, a regex or omitted.\n"
       "Provided matching strategy '" matcher "' is of type " (type matcher)))

(defn ^:dynamic cannot-disjoin-dirac-session-msg []
  (str "Your session is a Dirac session. Cannot disjoin this type of session."))

(defn ^:dynamic cannot-disjoin-clojure-session-msg []
  (str "Your session is not joined to Dirac. Nothing to do."))

(defn ^:dynamic session-disjoined-msg []
  (str "Your session was disjoined from Dirac. Now you are back in normal Clojure session."))

(defn ^:dynamic cannot-match-dirac-session-msg []
  (str "Your session is a Dirac session. This type of session cannot join any other session."))

(defn ^:dynamic cannot-match-clojure-session-msg []
  (str "Your session is not joined to Dirac. Use `(dirac! :join)` to join the Dirac first."))

(defn ^:dynamic no-matching-dirac-sessions-msg [info]
  (str "No connected Dirac session is \"" info "\"."))

(defn ^:dynamic list-matching-dirac-sessions-msg [info tags]
  (let [printer (fn [i tag]
                  (str (if (zero? i) "  * " "    ") tag))]
    (str "Listing Dirac sessions which are \"" info "\":\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic no-dirac-sessions-msg []
  (str "No Dirac sessions are currently available. Connect with at least one Dirac REPL to your nREPL server."))

(defn ^:dynamic list-dirac-sessions-msg [tags]
  (let [printer (fn [i tag]
                  (str "  #" (inc i) " " tag))]
    (str "Listing all Dirac sessions currently connected to your nREPL server:\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic default-error-msg [command]
  (str "Unrecognized Dirac command '" command "'\n"
       "Use `(dirac! :help)` to list all available commands."))

(defn ^:dynamic after-join-msg []
  (str "Your session joined Dirac (ClojureScript). "
       "The specific target Dirac session will be determined dynamically according to current matching strategy."))

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
  (let [tags (sessions/get-dirac-session-tags)]
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
      :else (let [description (sessions/get-target-session-info session)
                  tags (sessions/list-matching-sessions-tags session)]
              (if (empty? tags)
                (println (no-matching-dirac-sessions-msg description))
                (println (list-matching-dirac-sessions-msg description tags))))))
  ::no-result)

; -- default handler --------------------------------------------------------------------------------------------------------

(defmethod dirac! :default [command & _]
  (error-println (default-error-msg command))
  ::no-result)