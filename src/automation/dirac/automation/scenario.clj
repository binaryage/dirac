(ns dirac.automation.scenario)

(defmacro exec-with-feedback! [form]
  (let [printed-form (pr-str form)]
    `(do
       (dirac.automation.scenario/go-post-feedback! ~printed-form "scenario !>")
       (let [result# ~form
             printed-result# (dirac.shared.utils/strip-last-nl (cljs.core/with-out-str (dirac.shared.pprint/pprint result#)))]
         (dirac.automation.scenario/go-post-feedback! printed-result# "scenario =>")))))

(defmacro with-feedback [& forms]
  (let [make-exec (fn [form]
                    `(dirac.automation.scenario/exec-with-feedback! ~form))
        execs (map make-exec forms)]
    `(do ~@execs)))

(defmacro with-captured-console [& forms]
  `(try
     (dirac.automation.scenario/capture-console-as-feedback!)
     ~@forms
     (finally
       (dirac.automation.scenario/uncapture-console-as-feedback!))))
