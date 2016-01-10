(ns dirac.implant.console)

(defn get-console-view []
  (if js/WebInspector.ConsolePanel._instanceObject
    js/WebInspector.ConsolePanel._instanceObject._view))                                                                      ; TODO: do some sanity checks here

(defn set-repl-ns! [ns-name]
  (if-let [console-view (get-console-view)]
    (.setDiracReplNS console-view ns-name)))

(defn announce-job-end! [job-id]
  (.log js/console "job end" job-id)
  (if-let [console-view (get-console-view)]
    (.onJobEnded console-view job-id)))

(defn announce-job-start! [job-id]
  (.log js/console "job start" job-id)
  (if-let [console-view (get-console-view)]
    (.onJobStarted console-view job-id)))