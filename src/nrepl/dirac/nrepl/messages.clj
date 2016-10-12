(ns dirac.nrepl.messages
  (:require [dirac.nrepl.helpers :as helpers]
            [clojure.string :as string]))

; -- dirac! controls --------------------------------------------------------------------------------------------------------

(defn ^:dynamic make-no-such-command-msg [command]
  (str "No such command '" command "'.\n"
       "Execute `(dirac! :help)` for a list of available commands."))

(defn ^:dynamic make-invalid-session-matching-msg [input]
  (str "Invalid session matching strategy provided. It must be either an integer, a string, a regex or omitted.\n"
       "Provided matching strategy '" input "' is of type " (type input) "."))

(defn ^:dynamic make-cannot-disjoin-dirac-session-msg []
  (str "Your session is a Dirac session. Cannot disjoin this type of session."))

(defn ^:dynamic make-cannot-disjoin-clojure-session-msg []
  (str "Your session is not joined to Dirac. Nothing to do."))

(defn ^:dynamic make-session-disjoined-msg []
  (str "Your session was disjoined from Dirac. Now you are back in normal Clojure session."))

(defn ^:dynamic make-cannot-join-dirac-session-msg []
  (str "Your session is a Dirac session. This type of session cannot join any other session."))

(defn ^:dynamic make-no-matching-dirac-sessions-msg [info]
  (str "Currently there are no Dirac sessions matching the strategy '" info "'."))

(defn ^:dynamic make-list-matching-dirac-sessions-msg [info tags]
  (let [printer (fn [i tag]
                  (str (if (zero? i) " ~> " "    ") tag))]
    (str "Listing Dirac sessions which are matching the strategy '" info "':\n"
         (string/join "\n" (map-indexed printer tags)))))

(defn ^:dynamic make-list-dirac-sessions-msg [tags current-tag marker]
  (assert (and (string? marker) (= 2 (count marker))))
  (if (empty? tags)
    (str "No Dirac sessions are currently available. Connect with at least one Dirac REPL to your nREPL server.")
    (let [printer (fn [i tag]
                    (str (if (= tag current-tag) (str " " marker " " "#") "    #") (inc i) " " tag))]
      (str "Listing all Dirac sessions currently connected to your nREPL server:\n"
           (string/join "\n" (map-indexed printer tags))))))

(defn ^:dynamic make-default-error-msg [command]
  (str "Unrecognized Dirac command '" command "'\n"
       "Use `(dirac! :help)` to list all available commands."))

(defn ^:dynamic make-after-join-msg []
  (str "Specific target Dirac session will be determined dynamically according to current matching strategy."))

(defn ^:dynamic make-list-compilers-msg [descriptor-ids selected-compiler-id marker]
  (assert (and (string? marker) (= 2 (count marker))))
  (if (empty? descriptor-ids)
    (str "No ClojureScript compilers currently available in your nREPL server.")
    (let [printer (fn [i descriptor-id]
                    (str (if (= descriptor-id selected-compiler-id)
                           (str " " marker " #")
                           "    #")
                         (inc i) " " descriptor-id))]
      (str "Listing all ClojureScript compilers currently available in your nREPL server:\n"
           (string/join "\n" (map-indexed printer descriptor-ids))))))

(defn ^:dynamic make-no-compilers-msg [selected-compiler]
  (let [compiler (helpers/make-human-readable-selected-compiler selected-compiler)]
    (str "No ClojureScript compiler matching " compiler " is currently available.\n"
         "You may want to use `(dirac! :ls)` to review current situation.")))

(defn ^:dynamic make-status-msg [session-description]
  (str "Your current nREPL session is a " session-description "."))

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
    (str "Killed " cnt " " (helpers/simple-pluralize cnt "compiler") ": " (helpers/make-human-readable-list killed-compiler-ids) ".")))

(defn ^:dynamic make-report-invalid-compilers-not-killed-msg [user-input invalid-compiler-ids]
  (str "Some compilers matching your input '" user-input "' cannot be killed because they don't belong to Dirac.\n"
       "The list of invalid matching compilers: " (helpers/make-human-readable-list invalid-compiler-ids) ".\n"
       "For example if you wanted to manipulate Figwheel compilers you have to use Figwheel's own interface for that:\n"
       "=> https://github.com/bhauman/lein-figwheel#repl-figwheel-control-functions."))

(defn ^:dynamic make-retargeting-warning-msg []
  (str "You are in a joined Dirac session. This command is being executed as if it was entered in the target session."))

(defn ^:dynamic make-figwheel-api-not-found-msg [api-name]
  (str "Figwheel API '" api-name "' was not found.\n"
       "Please make sure you have figwheel-sidecar properly installed in your nREPL server:\n"
       "  => https://github.com/bhauman/lein-figwheel/wiki/Using-the-Figwheel-REPL-within-NRepl"))

(defn ^:dynamic make-figwheel-bad-api-msg [api-name]
  (str "Figwheel API '" api-name "' is not a function.\n"
       "Please make sure you are loading the latest/expected Figwheel version in your nREPL server to prevent any mismatch:\n"
       "  => https://github.com/bhauman/lein-figwheel/wiki/Using-the-Figwheel-REPL-within-NRepl"))

; -- joined session ---------------------------------------------------------------------------------------------------------

(defn ^:dynamic make-missing-nrepl-message-msg []
  (str "Unable to bootstrap Dirac CLJS REPL because a relevant nREPL message is not available.\n"
       "This is likely caused by missing 'interruptible-eval' middleware which is normally included by default.\n"
       "Dirac nREPL middleware currently depends on eval behaviour in 'interruptible-eval' middleware."))

(defn ^:dynamic make-no-target-session-help-msg [info]
  (str "Your session joined Dirac but no connected Dirac session is \"" info "\".\n"
       "You can review the list of currently available Dirac sessions via `(dirac! :ls)`.\n"
       "You can join one of them with `(dirac! :join)`.\n"
       "See `(dirac! :help)` for more info."))

(defn ^:dynamic make-no-target-session-match-msg [_info]
  (str "No suitable Dirac session is connected to handle your command."))

(defn ^:dynamic make-nrepl-message-cannot-be-forwarded-msg [message-info]
  (str "Encountered an nREPL message which cannot be forwarded to joined Dirac session:\n"
       message-info))

(defn ^:dynamic make-no-forwarding-help-msg [op]
  (str "Your have a joined Dirac session and your nREPL client just sent an unsupported nREPL operation to it.\n"
       "Ask Dirac developers to implement '" op "' op: https://github.com/binaryage/dirac/issues."))

(defn ^:dynamic make-missing-compiler-msg [selected-compiler]
  (let [compiler (helpers/make-human-readable-selected-compiler selected-compiler)]
    (str "Selected compiler '" compiler "' is missing. It does not match any of available compilers.\n"
         "Use `(dirac! :ls)` to review current situation and "
         "`(dirac! :switch <compiler-id>)` to switch to an existing compiler.")))
