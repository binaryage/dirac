(ns dirac.fixtures.task)

(defmacro without-transcript [& body]
  `(dirac.fixtures.transcript-host/without-transcript-work (fn [] ~@body)))

(defmacro go-task [& args]
  (let [first-arg (first args)
        config (if (map? first-arg) first-arg)
        commands (if config (rest args) args)]
    `(let [test-thunk# (fn []
                         (cljs.core.async.macros/go
                           (dirac.fixtures.task/task-started!)
                           ~@commands
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
