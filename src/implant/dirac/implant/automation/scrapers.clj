(ns dirac.implant.automation.scrapers
  (:require [clojure.pprint :refer [pprint]]))

(defmacro check-result [form]
  (let [err-msg (str "Unable to obtain:\n"
                     (pr-str form) "\n\n"
                     "hint: likely cause is a change introduced into DevTools DOM structure.")]
    `(if-let [result# ~form]
       result#
       (throw ~err-msg))))

(defmacro safe->> [& forms]
  (let [form-str (with-out-str
                   (binding [*print-level* 10]
                     (pprint forms)))
        result-sym (gensym "result")
        concat-arg (fn [cmd]
                     (concat cmd [result-sym]))
        wrap-command (fn [cmd]
                       `(try
                          (check-result ~cmd)
                          (catch :default e#
                            (throw (str e# "\n\n" "form:\n" ~form-str)))))
        commands (map (comp wrap-command concat-arg) (rest forms))]
    `(as-> ~(wrap-command (first forms)) ~result-sym ~@commands)))
