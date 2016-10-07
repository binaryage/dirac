(ns dirac.nrepl.usage
  (:require [clojure.string :as string]))

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
   "  :spawn   -> start a new ClojureScript compiler"
   "  :kill    -> kill ClojureScript compilers"
   ""
   "  :join    -> join a Dirac session"
   "  :disjoin -> disjoin Dirac session"
   "  :match   -> list matching Dirac sessions"
   ""
   "  :fig     -> Figwheel REPL API bridge"
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
   "  1. `(dirac! :join <string>)`"
   "  2. `(dirac! :join <integer>)`"
   "  3. `(dirac! :join <regex>)`"
   "  4. `(dirac! :join)`"
   ""
   "Join or re-join first Dirac session matching provided input (a matching strategy)."
   "In other words: this Clojure nREPL session joins a specific target Dirac session."
   "When joined, this session will forward all incoming eval requests to the matched target Dirac session."
   ""
   "To list all available Dirac sessions use `(dirac! :ls)`."
   "Matching is done dynamically for every new eval request. Connected Dirac sessions are tested in historical order."
   "Matching strategy must be either a string(1), an integer(2), a regex(3) or omitted(4)."
   "String-based matching targets first Dirac session matching the provided substring."
   "Integer-based matching targets nth session in the list."
   "Regex-based matching targets first Dirac session matching the provided regular expression."
   "If no matching strategy is provided, this session will target the most recent Dirac session in the list."
   ""
   "Note: Dirac sessions are not persistent. They are created when Dirac DevTools instance opens a Console Panel and switches"
   "      console prompt to the Dirac REPL. Dirac sessions are destroyed when Dirac DevTools window gets closed or on page refresh."
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

(def ^:dynamic switch-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :switch <string>)`"
   "  2. `(dirac! :switch <integer>)`"
   "  3. `(dirac! :switch <regexp>)`"
   "  4. `(dirac! :switch)`"
   ""
   "Switch to another ClojureScript compiler matching provided input (a matching strategy)."
   ""
   "To list all available ClojureScript compilers use `(dirac! :ls)`."
   "Matching is done dynamically for every new eval request."
   "Matching strategy must be either a integer(1), a string(2), a regex(3) or omitted(4)."
   "Integer-based matching targets nth compiler in the list."
   "String-based matching targets first compiler matching the provided substring."
   "Regex-based matching targets first compiler matching the provided regular expression."
   "If no matching strategy is provided, eval will use the first compiler in the list."])

(def ^:dynamic spawn-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :spawn)`"
   "  2. `(dirac! :spawn {:dirac-nrepl-config {...}"
   "                      :repl-options {...}})`"
   ""
   "Initialize a new ClojureScript compiler and switch to it."
   ""
   "New compiler/repl environment bootstrapping is subject to many possible options. By default we reuse configuration from"
   "current Dirac session. That is the reason why :spawn can be called only from a properly configured Dirac session."
   "For advanced usage you have a chance to override the configuration by passing in an options map (optional)."])

(def ^:dynamic kill-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :kill)`"
   "  2. `(dirac! :kill <string>)`"
   "  3. `(dirac! :kill <integer>)`"
   "  4. `(dirac! :kill <regexp>)`"
   ""
   "Kill and remove existing ClojureScript compilers matching provided input (a matching strategy)."
   ""
   "To list all available ClojureScript compilers use `(dirac! :ls)`."
   "Calling :kill without parameters kills currently selected compiler."
   "If matching strategy was provided it uses same matching algorithm as :switch."
   "It must be either a integer(2), a string(3), a regex(4)."
   "Integer-based matching kills nth compiler in the list."
   "String-based matching kills all compilers matching the provided substring."
   "Regex-based matching kills all compilers matching the provided regular expression."
   ""
   "Note: It is allowed to kill Dirac's own compilers. For example if you have Figwheel compilers present, we
          don't allow killing them via `(dirac! :kill ...)`. You have to use Figwheel's own interface to manipulate its"
   "      compilers."])

(def ^:dynamic fig-usage
  ["Usage forms:"
   ""
   "  1. `(dirac! :fig)`"
   "  2. `(dirac! :fig api-fn & args)`"
   ""
   "Call Figwheel REPL API (if present)."
   ""
   "This is a bridge provided for convenince to allow controlling Figwheel directly from Dirac REPL."
   ""
   "You may provide api-fn as a string, keyword or symbol. Figwheel API function is resolved dynamically."
   "Function arguments must be specified precisely as expected by Figwheel API."
   ""
   "  Examples:"
   "    `(dirac! :fig :fig-status)`  ; <= this is equivalent to `(dirac! :fig)`"
   "    `(dirac! :fig :print-config)`"
   "    `(dirac! :fig :build-once \"my-build-id\")`"
   ""
   "Please refer to Figwheel docs for full list of control functions:"
   "  => https://github.com/bhauman/lein-figwheel#repl-figwheel-control-functions"])

; -- public docs map --------------------------------------------------------------------------------------------------------

(defn render-usage [lines]
  (string/join "\n" lines))

(def ^:dynamic docs
  {nil      (render-usage general-usage)
   :help    (render-usage help-usage)
   :version (render-usage version-usage)
   :status  (render-usage status-usage)
   :ls      (render-usage ls-usage)
   :join    (render-usage join-usage)
   :disjoin (render-usage disjoin-usage)
   :match   (render-usage match-usage)
   :switch  (render-usage switch-usage)
   :spawn   (render-usage spawn-usage)
   :kill    (render-usage kill-usage)
   :fig     (render-usage fig-usage)})
