(ns dirac.fixtures)

(def ^:const LAUNCH_TRANSCRIPT_TEST_KEY "launchTranscriptTest")

(defmacro get-launch-transcript-test-key []
  LAUNCH_TRANSCRIPT_TEST_KEY)

(defmacro without-transcript [& body]
  `(dirac.fixtures/without-transcript-work (fn [] ~@body)))

(defmacro go-test [& body]
  `(let [test-thunk# (fn []
                       (cljs.core.async.macros/go
                         (task-started!)
                         ~@body
                         (task-finished!)))]
     (chromex.support/oset ~'js/window [(get-launch-transcript-test-key)] test-thunk#)
     (setup!)))

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
