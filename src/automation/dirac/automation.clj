(ns dirac.automation)

(defmacro go-job [& body]
  `(cljs.core.async/go
     (cljs.core.async/<! (dirac.automation.task/go-start-task!))
     ~@body
     (if (dirac.automation.task/running?)
       (cljs.core.async/<! (dirac.automation.task/go-finish-task!)))))

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
                                                     (cljs.test/empty-env :cljs.test/default)))
                                                 (fn []
                                                   (dirac.automation.task/go-kill-task!)))
       (dirac.automation.task/go-setup-task!))))

; this macro exists solely to work around a bug in cljs compiler
; too many commands on single go-block level causes infinite compiler loop:
; https://gist.github.com/darwin/19552acb6f94887d641e878272a19f3c
; I believe this to be related to http://dev.clojure.org/jira/browse/CLJS-365
; I'm not sure what go macro does exactly, but it might generate an apply call which exceeds safe number of args
(defmacro chunkify [& commands]
  (let [safe-number-of-commands 17                                                                                            ; this number was determined experimentally, 18 seems to be smallest size causing stack overflow
        command-chunks (partition-all safe-number-of-commands commands)
        gen-chunk (fn [commands] `(cljs.core.async/<! (cljs.core.async/go ~@commands)))]
    `(do
       ~@(map gen-chunk command-chunks))))

(defmacro <!* [action & args]
  {:pre [(symbol? action)]}
  `(cljs.core.async/<! (dirac.automation.machinery/go-action! ~action (meta #'~action) ~@args)))

(defmacro with-scenario [name & body]
  `(let [scenario-id# (dirac.automation/<!* dirac.automation/go-open-scenario! ~name)]
     (binding [dirac.automation.machinery/*current-scenario-id* scenario-id#]
       ~@body)
     (dirac.automation/<!* dirac.automation/go-close-scenario! scenario-id#)
     scenario-id#))

(defmacro with-devtools [& args]
  (let [params (if (map? (first args)) (first args))
        commands (if (some? params) (rest args) args)]
    `(let [devtools-id# (dirac.automation/<!* dirac.automation/go-open-devtools! ~@(if (some? params) [params]))]
       ~@commands
       (dirac.automation/<!* dirac.automation/go-close-devtools!)
       devtools-id#)))

(defmacro with-options [options & body]
  {:pre [(map? options)]}
  `(do
     (dirac.automation/<!* dirac.automation/go-store-options!)
     (dirac.automation/<!* dirac.automation/go-set-options! ~options)
     ~@body
     (dirac.automation/<!* dirac.automation/go-restore-options!)))

(defmacro testing [title & body]
  `(let [title# ~title]
     (dirac.automation.machinery/start-testing! title#)
     (cljs.test/testing title# ~@body)
     (dirac.automation.machinery/end-testing! title#)))

(defmacro with-console-feedback [& body]
  `(do
     (dirac.automation/<!* dirac.automation/go-enable-console-feedback!)
     ~@body
     (dirac.automation/<!* dirac.automation/go-disable-console-feedback!)))

