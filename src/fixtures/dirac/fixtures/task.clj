(ns dirac.fixtures.task)

(defmacro without-transcript [& body]
  `(dirac.fixtures.transcript-host/without-transcript-work (fn [] ~@body)))

(defmacro run-task [& steps]
  (let [first-arg (first steps)
        config (if (map? first-arg) first-arg)
        commands (if config (rest steps) steps)
        serialized-commands (map (fn [command] `(cljs.core.async/<! ~command)) commands)]
    `(let [test-thunk# (fn []
                         (cljs.core.async.macros/go
                           (dirac.fixtures.task/task-started!)
                           ~@serialized-commands
                           (dirac.fixtures.task/task-finished!)
                           (dirac.fixtures.task/task-teardown!)))]
       (dirac.fixtures.launcher/register-task! test-thunk#)
       (dirac.fixtures.task/task-setup! ~config))))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defn prefix []
  "TASK:")

(defmacro log [& args]
  `(do (.log js/console ~(prefix) ~@args) nil))

(defmacro info [& args]
  `(do (.info js/console ~(prefix) ~@args) nil))

(defmacro error [& args]
  `(do (.error js/console ~(prefix) ~@args) nil))

(defmacro warn [& args]
  `(do (.warn js/console ~(prefix) ~@args) nil))
