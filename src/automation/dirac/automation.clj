(ns dirac.automation)

(defmacro go-task [& steps]
  (let [first-arg (first steps)
        config (if (map? first-arg) first-arg)
        commands (if config (rest steps) steps)]
    `(let [task-job# (fn []
                       (cljs.core.async.macros/go
                         (cljs.core.async/<! (dirac.automation.task/task-started!))
                         ~@commands
                         (cljs.core.async/<! (dirac.automation.task/task-finished!))))]
       (dirac.automation.launcher/register-task! task-job#)
       (dirac.automation.task/task-setup! ~config))))

(defmacro <!* [action & args]
  {:pre [(symbol? action)]}
  `(cljs.core.async/<! (dirac.automation/action! ~action (meta #'~action) ~@args)))