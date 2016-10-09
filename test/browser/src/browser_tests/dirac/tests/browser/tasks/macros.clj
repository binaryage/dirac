(ns dirac.tests.browser.tasks.macros)

(defmacro with-transcript-test [test-name & body]
  `(try
     (binding [dirac.tests.browser.tasks.transcript/*current-transcript-test* ~test-name]
       ~@body)
     (catch Throwable e#
       (let [label# (dirac.tests.browser.tasks.helpers/get-transcript-test-label ~test-name)]
         (clojure.test/do-report {:type     :fail
                                  :message  (str label# " failed.")
                                  :expected "no exception"
                                  :actual   (str e#)}))
       (clojure.stacktrace/print-stack-trace e#))))

(defmacro with-transcript-suite [suite-name & body]
  `(binding [dirac.tests.browser.tasks.transcript/*current-transcript-suite* ~suite-name]
     ~@body))
