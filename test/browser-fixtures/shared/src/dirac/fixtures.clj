(ns dirac.fixtures)

(def ^:const LAUNCH_TRANSCRIPT_TEST_KEY "launchTranscriptTest")

(defmacro get-launch-transcript-test-key []
  LAUNCH_TRANSCRIPT_TEST_KEY)

(defmacro without-transcript [& body]
  `(dirac.fixtures/without-transcript-work (fn [] ~@body)))

(defmacro go-test [& args]
  (let [first-arg (first args)
        config (if (map? first-arg) first-arg)
        commands (if config (rest args) args)]
    `(let [test-thunk# (fn []
                         (cljs.core.async.macros/go
                           (task-started!)
                           ~@commands
                           (task-finished!)))]
       (chromex.support/oset ~'js/window [(get-launch-transcript-test-key)] test-thunk#)
       (setup! ~config))))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defn prefix []
  "FIXTURE:")

(defmacro log [& args]
  `(do (.log js/console ~(prefix) ~@args) nil))

(defmacro info [& args]
  `(do (.info js/console ~(prefix) ~@args) nil))

(defmacro error [& args]
  `(do (.error js/console ~(prefix) ~@args) nil))

(defmacro warn [& args]
  `(do (.warn js/console ~(prefix) ~@args) nil))
