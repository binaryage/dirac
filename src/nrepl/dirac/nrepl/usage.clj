(ns dirac.nrepl.usage
  (:require [clojure.string :as string]))

; -- usage docs -------------------------------------------------------------------------------------------------------------

(def ^:dynamic general-usage
  ["You can control Dirac REPL via special `dirac` command:"
   ""
   "  `(dirac <action> [arg1] [arg2] [...])`"
   ""
   "The argument `action` is a keyword followed by optional arguments."
   ""
   "List of supported actions:"
   ""
   "  `:status`     print current session state"
   "  `:ls`         list available sessions/compilers"
   ""
   "  `:switch`     switch ClojureScript compiler"
   "  `:spawn`      start a new ClojureScript compiler"
   "  `:kill`       kill ClojureScript compiler"
   ""
   "  `:join`       join a Dirac session"
   "  `:disjoin`    disjoin Dirac session"
   "  `:match`      list matching Dirac sessions"
   ""
   "  `:fig`        Figwheel REPL API bridge"
   "  `:fig2`       Figwheel Main REPL API bridge"
   "  `:shadow`     Shadow-CLJS API bridge"
   ""
   "  `:version`    print version info"
   "  `:help`       print usage help"
   ""
   "For more information use `(dirac :help <action>)`."
   "Also note that outer-most parentheses are optional. You may also alternatively use `dirac!`."])

(def ^:dynamic help-usage
  ["Print general usage help or specific dirac action usage help."
   ""
   "  1. `(dirac)`"
   "  2. `(dirac :help)`"
   "  3. `(dirac :help <action>)`"])

(def ^:dynamic version-usage
  ["Print version info."
   ""
   "  1. `(dirac :version)`"])

(def ^:dynamic status-usage
  ["Print status of current nREPL session."
   ""
   "  1. `(dirac :status)`"
   ""
   "If in joined session, will also print status of the target session."])

(def ^:dynamic ls-usage
  ["Print listing of all currently connected Dirac sessions and available ClojureScript compilers."
   ""
   "  1. `(dirac :ls)`"
   ""
   "Sessions are listed in historical order as they connected."
   "Compilers are listed in the following order:"
   "  1. compilers spawned by current Dirac session in historical order"
   "  2. compilers spawned by other Dirac sessions"
   "  3. foreign compilers not spawned by Dirac, e.g. Figwheel compilers"
   ""
   "Note: Current session and compiler are marked with an arrow."])

(def ^:dynamic join-usage
  ["Join or re-join first Dirac session matching provided input."
   ""
   "  1. `(dirac! :join <string>)`"
   "  2. `(dirac! :join <integer>)`"
   "  3. `(dirac! :join <regexp>)`"
   "  4. `(dirac! :join)`"
   ""
   "In other words: this Clojure nREPL session joins a specific target Dirac session."
   "When joined, this session will forward all incoming eval requests to the matched target Dirac session."
   ""
   "To list all available Dirac sessions use `(dirac :ls)`."
   "Matching is done dynamically for every new eval request. Connected Dirac sessions are tested in historical order."
   "The input must be either a string(1), an integer(2), a regex(3) or omitted(4)."
   "String-based matching targets first Dirac session matching the provided substring."
   "Integer-based matching targets n-th session in the list."
   "Regexp-based matching targets first Dirac session matching the provided regular expression."
   "If no matching strategy was provided, this session will target the most recent Dirac session in the list."
   ""
   "Note: Dirac sessions are not persistent. They are created when Dirac DevTools instance opens a Console Panel and switches"
   "      console prompt to the Dirac REPL. Dirac sessions are destroyed when Dirac DevTools window gets closed or on page refresh."
   "      Dynamic matching helps us to keep stable targeting of specific Dirac session even if DevTools app gets closed and"
   "      reopened. In cases when there is no matching target Dirac session available, we will warn you and evaluation will result"
   "      in a no-op. You may want to use `(dirac :match)` command to test/troubleshoot your current matching strategy."])

(def ^:dynamic disjoin-usage
  ["Disjoin previously joined Dirac session."
   ""
   "  1. `(dirac! :disjoin)`"
   ""
   "Future eval requests will be executed in the context of your original Clojure session."])

(def ^:dynamic match-usage
  ["List Dirac sessions matching provided input."
   ""
   "  1. `(dirac :match <string>)`"
   "  2. `(dirac :match <integer>)`"
   "  3. `(dirac :match <regexp>)`"
   "  4. `(dirac :match)`"
   ""
   "This command is available for testing purposes. It can be used for fine-tuning your session matching substring or regexp."
   "The command has the same signature as `(dirac :join ...)`. Please read `(dirac :help :join)` for details about matching."])

(def ^:dynamic switch-usage
  ["Switch to another ClojureScript compiler matching provided input."
   ""
   "  1. `(dirac! :switch <string>)`"
   "  2. `(dirac! :switch <integer>)`"
   "  3. `(dirac! :switch <regexp>)`"
   "  4. `(dirac! :switch)`"
   ""
   "To list all available ClojureScript compilers use `(dirac :ls)`."
   "Matching is done dynamically for every new eval request."
   "Matching argument must be either an integer(1), a string(2), a regex(3) or omitted(4)."
   "Integer-based matching targets nth compiler in the list."
   "String-based matching targets first compiler matching the provided substring."
   "Regexp-based matching targets first compiler matching the provided regular expression."
   "If no matching strategy was provided, eval will use the first compiler in the list."
   ""
   "Note: If in a joined session, this command will apply to the target session."])

(def ^:dynamic spawn-usage
  ["Initialize a new ClojureScript compiler."
   ""
   "  1. `(dirac! :spawn)`"
   "  2. `(dirac! :spawn {:dirac-nrepl-config {...} :repl-options {...}})`"
   ""
   "New compiler/repl environment bootstrapping is subject to many possible options. By default we reuse configuration from"
   "current Dirac session. That is the reason why :spawn can be called only from a properly configured Dirac session."
   "For advanced usage you have a chance to override the configuration by passing in an options map (optional)."
   "You can switch to the newly created compiler via `(dirac! :switch)`"
   ""
   "Note: If in a joined session, this command will apply to the target session."])

(def ^:dynamic kill-usage
  ["Kill and remove existing ClojureScript compiler(s) matching provided input."
   ""
   "  1. `(dirac! :kill)`"
   "  2. `(dirac! :kill <string>)`"
   "  3. `(dirac! :kill <integer>)`"
   "  4. `(dirac! :kill <regexp>)`"
   ""
   "To list all available ClojureScript compilers use `(dirac :ls)`."
   "Calling :kill without parameters kills currently selected compiler."
   "If an extra argument was provided it uses the same matching algorithm as :switch."
   "It must be either an integer(2), a string(3), a regexp(4)."
   "Integer-based matching kills n-th compiler in the list."
   "String-based matching kills all compilers matching the provided substring."
   "Regexp-based matching kills all compilers matching the provided regular expression."
   ""
   "Note: If in a joined session, this command will apply to the target session."
   "Note: It is allowed to kill only Dirac's own compilers. For example if you have Figwheel compilers present, we
          don't allow killing them via `(dirac! :kill ...)`. You have to use Figwheel's own interface to manipulate its"
   "      compilers."])

(def ^:dynamic fig-usage
  ["Call Figwheel REPL API (if present)."
   ""
   "  1. `(dirac :fig)`"
   "  2. `(dirac :fig api-fn & args)`"
   ""
   "This is a bridge provided for convenience to allow controlling Figwheel directly from Dirac REPL."
   ""
   "You may provide api-fn as a string, a keyword or a symbol. Figwheel API function is resolved dynamically."
   "Function arguments must be specified precisely as expected by Figwheel API."
   ""
   "  Examples:"
   "    `(dirac :fig :fig-status)`  ; <= this is equivalent to `(dirac :fig)`"
   "    `(dirac :fig :print-config)`"
   "    `(dirac :fig :build-once \"my-build-id\")`"
   "    `(dirac :fig :api-help)`"
   ""
   "Please refer to Figwheel docs for full list of control functions:"
   "  => https://github.com/bhauman/lein-figwheel#repl-figwheel-control-functions"])

(def ^:dynamic fig2-usage
  ["Call Figwheel Main REPL Controls API (if present)."
   ""
   "  1. `(dirac :fig2)`"
   "  2. `(dirac :fig2 api-fn & args)`"
   ""
   "This is a bridge provided for convenience to allow controlling Figwheel Main directly from Dirac REPL."
   ""
   "You may provide api-fn as a string, a keyword or a symbol. Figwheel Main API function is resolved dynamically."
   "Function arguments must be specified precisely as expected by Figwheel Main API."
   ""
   "  Examples:"
   "    `(dirac :fig2 :status)`  ; <= this is equivalent to `(dirac :fig2)`"
   "    `(dirac :fig2 :clean)`"
   "    `(dirac :fig2 :reset \"my-build-id\")`"
   "    `(dirac :fig2 :build-once \"my-build-id\")`"
   "    `(dirac :fig2 :stop-builds \"my-build-id\")`"
   "    `(dirac :fig2 :start-builds \"my-build-id\")`"
   ""
   "    `(dirac :fig2 :figwheel.repl/conns)`"
   "    `(dirac :fig2 :figwheel.repl/focus \"session-name\")`"
   ""
   "Please refer to Figwheel docs for full list of control functions:"
   "  => https://figwheel.org/docs"])

(def ^:dynamic shadow-usage
  ["Call Shadow-CLJS API (if present)."
   ""
   "  1. `(dirac :shadow)`"
   "  2. `(dirac :shadow api-fn & args)`"
   ""
   "This is a bridge provided for convenience to allow controlling shadow-cljs directly from Dirac REPL."
   ""
   "You may provide api-fn as a string, a keyword or a symbol. Shadow-CLJS API function is resolved dynamically."
   "Function arguments must be specified precisely as expected by Shadow-CLJS API."
   ""
   "  Examples:"
   "    `(dirac :shadow :help)`  ; <= this is equivalent to `(dirac :shadow)`"
   "    `(dirac :shadow :get-build-config :some-build-id)`"
   "    `(dirac :shadow :compile :some-build-id {:some :opts})`"
   ""
   "Please refer to Shadow-CLJS docs for full list of control functions:"
   "  => https://shadow-cljs.github.io/docs/UsersGuide.html#_clojure_repl"])

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
   :fig     (render-usage fig-usage)
   :fig2    (render-usage fig2-usage)})
