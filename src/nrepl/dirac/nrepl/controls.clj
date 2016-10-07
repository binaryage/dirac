(ns dirac.nrepl.controls
  (:require [clojure.string :as string]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.helpers :refer [with-err-output get-nrepl-info error-println simple-pluralize
                                         make-human-readable-list make-human-readable-selected-compiler]]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.utils :as utils])
  (:import (java.util.regex Pattern)))

; note: this namespace defines the context where special dirac commands are eval'd

; -- usage docs -------------------------------------------------------------------------------------------------------------

(def ^:dynamic general-usage
  ["You can control Dirac REPL via this special `dirac!` command:"
   ""
   "  `(dirac! <sub-command> [arg1] [arg2] [...])`"
   ""
   "The argument <sub-command> is a keyword followed by optional arguments."
   ""
   "A list of known commands:"
   ""
   "  :status  -> prints current session state"
   "  :ls      -> list available Dirac sessions"
   ""
   "  :switch  -> switch ClojureScript compiler"
   "  :spawn   -> start a fresh ClojureScript compiler"                                                                       ; TODO: :spawn
   "  :kill    -> kill (selected) ClojureScript compiler"                                                                     ; TODO: :kill
   ""
   "  :join    -> join a Dirac session"
   "  :disjoin -> disjoin Dirac session"
   "  :match   -> list matching Dirac sessions"
   ""
   "  :version -> print version info"
   "  :help    -> print usage help"
   ""
   "For more information use `(dirac! :help <command>)`."])

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
   "  1. `(dirac! :join <integer>)`"
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
   "Matching strategy must be either a integer(1), a string(2), a regex(3) or omitted(4)."
   "Integer-based matching targets nth session from the list."
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
   :match   match-usage})                                                                                                     ; TODO: add docs for :switch and others

(defn render-usage [lines]
  (string/join "\n" lines))

; -- messages ---------------------------------------------------------------------------------------------------------------

(defn ^:dynamic make-no-such-command-msg [command]
  (str "No such command '" command "'.\n"
       "Execute `(dirac! :help)` for a list of available commands."))

(defn ^:dynamic make-invalid-matcher-msg [matcher]
  (str "Invalid matching strategy provided. It must be either a number, a string, a regex or omitted.\n"
       "Provided matching strategy '" matcher "' is of type " (type matcher)))

(defn ^:dynamic make-cannot-disjoin-dirac-session-msg []
  (str "Your session is a Dirac session. Cannot disjoin this type of session."))

(defn ^:dynamic make-cannot-disjoin-clojure-session-msg []
  (str "Your session is not joined to Dirac. Nothing to do."))

(defn ^:dynamic make-session-disjoined-msg []
  (str "Your session was disjoined from Dirac. Now you are back in normal Clojure session."))

(defn ^:dynamic make-cannot-join-dirac-session-msg []
  (str "Your session is a Dirac session. This type of session cannot join any other session."))

(defn ^:dynamic make-cannot-match-clojure-session-msg []
  (str "Your session is not joined to Dirac. Use `(dirac! :join)` to join the Dirac first."))

(defn ^:dynamic make-no-matching-dirac-sessions-msg [info]
  (str "No connected Dirac session is \"" info "\"."))

(defn ^:dynamic make-list-matching-dirac-sessions-msg [info tags]
  (let [printer (fn [i tag]
                  (str (if (zero? i) "  * " "    ") tag))]
    (str "Listing Dirac sessions which are \"" info "\":\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic make-list-dirac-sessions-msg [tags current-tag]
  (if (empty? tags)
    (str "No Dirac sessions are currently available. Connect with at least one Dirac REPL to your nREPL server.")
    (let [printer (fn [i tag]
                    (str (if (= tag current-tag) " -> #" "    #") (inc i) " " tag))]
      (str "Listing all Dirac sessions currently connected to your nREPL server:\n"
           (string/join "\n" (map-indexed printer tags))))))

(defn ^:dynamic make-default-error-msg [command]
  (str "Unrecognized Dirac command '" command "'\n"
       "Use `(dirac! :help)` to list all available commands."))

(defn ^:dynamic make-after-join-msg []
  (str "Your session joined Dirac (ClojureScript). "
       "The specific target Dirac session will be determined dynamically according to current matching strategy."))

(defn ^:dynamic make-list-compilers-msg [descriptors selected-compiler-id]
  (if (empty? descriptors)
    (str "No ClojureScript compilers currently available in your nREPL server.")
    (let [printer (fn [i descriptor]
                    (let [id (compilers/get-compiler-descriptor-id descriptor)]
                      (str (if (= id selected-compiler-id) " -> #" "    #") (inc i) " " id)))]
      (str "Listing all ClojureScript compilers currently available in your nREPL server:\n"
           (string/join "\n" (map-indexed printer descriptors))))))

(defn ^:dynamic make-no-compilers-msg [selected-compiler]
  (let [compiler (make-human-readable-selected-compiler selected-compiler)]
    (str "No ClojureScript compiler matching " compiler " is currently available.\n"
         "You may want to use `(dirac! :ls)` to review current situation.")))

(defn ^:dynamic make-status-msg [session-type dirac-session? selected-compiler compiler-descriptor]
  (str "Your current nREPL session is " session-type ".\n"
       (if dirac-session?
         (let [compiler (make-human-readable-selected-compiler selected-compiler)]
           (str "Your currently selected ClojureScript compiler is " compiler
                (if (some? compiler-descriptor)
                  (let [compiler-id (compilers/get-compiler-descriptor-id compiler-descriptor)]
                    (if (= compiler-id selected-compiler)
                      "."
                      (str " which is currently matching compiler <" compiler-id ">.")))
                  (str " which currently does not match any available compilers.")))))))

(defn ^:dynamic make-version-msg [nrepl-info]
  (str nrepl-info "."))

(defn ^:dynamic make-cljs-quit-msg []
  (str "To quit, type: :cljs/quit"))

(defn ^:dynamic make-invalid-compiler-error-msg [user-input]
  (str "Dirac's :switch sub-command accepts nil, positive integer, string or regex patterns. "
       "You have entered " (pr-str user-input) " which is of type " (type user-input) "."))

(defn ^:dynamic make-cannot-spawn-outside-dirac-session-msg []
  (str "Your session is not a Dirac session. Only Dirac sessions are able to spawn new ClojureScript compilers."))

(defn ^:dynamic make-no-killed-compilers-msg [user-input]
  (str "No Dirac ClojureScript compilers currently match your input '" user-input "'. No compilers were killed."))

(defn ^:dynamic make-report-killed-compilers-msg [_user-input killed-compiler-ids]
  (let [cnt (count killed-compiler-ids)]
    (str "Killed " cnt " " (simple-pluralize cnt "compiler") ": " (make-human-readable-list killed-compiler-ids) ".")))

(defn ^:dynamic make-report-invalid-compilers-not-killed-msg [user-input invalid-compiler-ids]
  (str "Some compilers matching your input '" user-input "' cannot be killed because they don't belong to Dirac.\n"
       "The list of invalid matching compilers: " (make-human-readable-list invalid-compiler-ids) ".\n"
       "For example if you wanted to manipulate Figwheel compilers you have to use Figwheel's own interface for that:\n"
       "=> https://github.com/bhauman/lein-figwheel#repl-figwheel-control-functions."))

; == special REPL commands ==================================================================================================

; we are forgiving when reading the sub-command argument,
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
      (error-println (make-no-such-command-msg command))))
  ::no-result)

; -- (dirac! :version) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :version [_ & _]
  (let [nrepl-info (get-nrepl-info)]
    (println (make-version-msg nrepl-info)))
  ::no-result)

; -- (dirac! :status) -------------------------------------------------------------------------------------------------------

(defmethod dirac! :status [_ & _]
  (let [session (sessions/get-current-session)
        session-type (sessions/get-session-type session)
        dirac-session? (state/dirac-session?)
        selected-compiler (state/get-session-selected-compiler)
        selected-compiler-descriptor (compilers/get-selected-compiler-descriptor)]
    (println (make-status-msg session-type dirac-session? selected-compiler selected-compiler-descriptor)))
  ::no-result)

; -- (dirac! :ls) -----------------------------------------------------------------------------------------------------------

(defmethod dirac! :ls [_ & _]
  (println (make-list-dirac-sessions-msg (sessions/get-dirac-session-tags)
                                         (sessions/get-current-session-tag)))
  (println)
  (println (make-list-compilers-msg (compilers/collect-all-available-compiler-descriptors)
                                    (compilers/get-selected-compiler-id)))
  ::no-result)

; -- (dirac! :join) ---------------------------------------------------------------------------------------------------------

(defn announce-join! [& _]
  (println (make-after-join-msg))
  (dirac! :match)                                                                                                             ; this should give user immediate feedback about newly matched sessions
  (println (make-cljs-quit-msg)))                                                                                             ; triggers Cursive switching to CLJS REPL mode

(defmethod dirac! :join [_ & [matcher]]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (make-cannot-join-dirac-session-msg))
      (nil? matcher) (announce-join! (sessions/join-session-with-most-recent-matcher! session))
      (integer? matcher) (announce-join! (sessions/join-session-with-integer-matcher! session matcher))
      (string? matcher) (announce-join! (sessions/join-session-with-substr-matcher! session matcher))
      (instance? Pattern matcher) (announce-join! (sessions/join-session-with-regex-matcher! session matcher))
      :else (error-println (make-invalid-matcher-msg matcher))))
  ::no-result)

; -- (dirac! :disjoin) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :disjoin [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (make-cannot-disjoin-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (make-cannot-disjoin-clojure-session-msg))
      :else (do
              (sessions/disjoin-session! session)
              (println (make-session-disjoined-msg)))))
  ::no-result)

; -- (dirac! :match) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :match [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (make-cannot-join-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (make-cannot-match-clojure-session-msg))
      :else (let [description (sessions/get-target-session-info session)
                  tags (sessions/list-matching-sessions-tags session)]
              (if (empty? tags)
                (println (make-no-matching-dirac-sessions-msg description))
                (println (make-list-matching-dirac-sessions-msg description tags))))))
  ::no-result)

; -- (dirac! :switch) -------------------------------------------------------------------------------------------------------

(defn validate-selected-compiler [user-input]
  (cond
    (or (nil? user-input) (string? user-input) (instance? Pattern user-input)) user-input
    (and (integer? user-input) (pos? user-input)) user-input
    :else ::invalid-input))

(defmethod dirac! :switch [_ & [user-input]]
  (let [selected-compiler (validate-selected-compiler user-input)]
    (if (= ::invalid-input selected-compiler)
      (error-println (make-invalid-compiler-error-msg user-input))
      (do
        (compilers/select-compiler! selected-compiler)
        (let [matched-compiler-descriptor (compilers/find-available-matching-compiler-descriptor selected-compiler)]
          (if (nil? matched-compiler-descriptor)
            (error-println (make-no-compilers-msg selected-compiler))))
        (state/send-response! (utils/prepare-current-env-info-response)))))
  ::no-result)

; -- (dirac! :spawn) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :spawn [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (not (sessions/dirac-session? session)) (error-println (make-cannot-spawn-outside-dirac-session-msg))
      :else (utils/spawn-compiler! state/*nrepl-message*)))
  ::no-result)

; -- (dirac! ::kill) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :kill [_ & [user-input]]
  (let [selected-compiler (validate-selected-compiler user-input)]
    (if (= ::invalid-input selected-compiler)
      (error-println (make-invalid-compiler-error-msg user-input))
      (let [[killed-compiler-ids invalid-compiler-ids] (utils/kill-matching-compilers! selected-compiler)]
        (if (empty? killed-compiler-ids)
          (error-println (make-no-killed-compilers-msg user-input))
          (do
            (println (make-report-killed-compilers-msg user-input killed-compiler-ids))
            (if-not (compilers/get-selected-compiler-id)                                                                      ; switch to first available compiler the current one got killed
              (compilers/select-compiler! nil))                                                                               ; note that this still might not guarantee valid compiler selection, the compiler list might be empty
            (state/send-response! (utils/prepare-current-env-info-response))))
        (if-not (empty? invalid-compiler-ids)
          (error-println (make-report-invalid-compilers-not-killed-msg user-input invalid-compiler-ids))))))
  ::no-result)

; -- default handler --------------------------------------------------------------------------------------------------------

(defmethod dirac! :default [command & _]
  (if (some? command)
    (error-println (make-default-error-msg command))
    (dirac! :help))
  ::no-result)
