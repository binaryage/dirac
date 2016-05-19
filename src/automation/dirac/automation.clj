(ns dirac.automation)

(defmacro without-transcript [& body]
  `(dirac.automation.transcript-host/without-transcript-work (fn [] ~@body)))

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

(defmacro with-devtools [devtools-id & body]
  (let [devtools-id-sym (gensym)
        sync-commands (map (fn [command] `(if-not @dirac.automation.task/done
                                            (cljs.core.async/<! (~(first command) ~devtools-id-sym ~@(rest command))))) body)]
    `(let [~devtools-id-sym ~devtools-id]
       ~@sync-commands)))