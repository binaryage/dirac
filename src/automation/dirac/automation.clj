(ns dirac.automation)

(defmacro go-job [& body]
  `(cljs.core.async.macros/go
     (cljs.core.async/<! (dirac.automation.task/task-started!))
     ~@body
     (if (dirac.automation.task/running?)
       (cljs.core.async/<! (dirac.automation.task/task-finished!)))))

(defmacro go-task [& args]
  (let [first-arg (first args)
        config (if (map? first-arg) first-arg)
        commands (if config (rest args) args)]
    `(do
       (cljs.test/deftest ~'browser-test
         (cljs.test/async ~'browser-test-done
           (dirac.automation/go-job
             ~@commands
             (~'browser-test-done))))
       (dirac.automation.launcher/register-task! (fn []
                                                   (cljs.test/run-tests
                                                     (cljs.test/empty-env :cljs.test/default))))
       (dirac.automation.task/task-setup!))))

; this macro exists solely to work around a bug in cljs compiler
; too many commands on single go-block level causes infinite compiler loop:
; https://gist.github.com/darwin/19552acb6f94887d641e878272a19f3c
; I believe this to be related to http://dev.clojure.org/jira/browse/CLJS-365
; I'm not sure what go macro does exactly, but it might generate an apply call which exceeds safe number of args
(defmacro chunkify [& commands]
  (let [safe-number-of-commands 17                                                                                            ; this number was determined experimentally, 18 seems to be smallest size causing stack overflow
        command-chunks (partition-all safe-number-of-commands commands)
        gen-chunk (fn [commands]
                    `(cljs.core.async/<! (cljs.core.async.macros/go
                                           ~@commands)))]
    `(do
       ~@(map gen-chunk command-chunks))))

(defmacro <!* [action & args]
  {:pre [(symbol? action)]}
  `(cljs.core.async/<! (dirac.automation/action! ~action (meta #'~action) ~@args)))

(defmacro with-scenario [name & body]
  `(let [scenario-id# (dirac.automation/<!* dirac.automation/open-tab-with-scenario! ~name)]
     ~@body
     (dirac.automation/<!* dirac.automation/close-tab-with-scenario! scenario-id#)))

(defmacro with-devtools [& args]
  (let [params (if (map? (first args)) (first args))
        commands (if (some? params) (rest args) args)]
    `(do
       (dirac.automation/<!* dirac.automation/open-devtools! ~@(if (some? params) [params]))
       ~@commands
       (dirac.automation/<!* dirac.automation/close-devtools!))))

(defmacro with-options [options & body]
  {:pre [(map? options)]}
  `(do
     (dirac.automation/<!* dirac.automation/store-options!)
     (dirac.automation/<!* dirac.automation/set-options! ~options)
     ~@body
     (dirac.automation/<!* dirac.automation/restore-options!)))
