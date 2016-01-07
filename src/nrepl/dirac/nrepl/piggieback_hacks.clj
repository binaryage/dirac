(ns dirac.nrepl.piggieback-hacks
  (:require [clojure.string :as string]))

(def code-template
  (str "(try"
       "  (js/devtools.dirac.present_repl_result 0 {code})"
       "  (catch :default e"
       "    (js/devtools.dirac.present_repl_exception 0 e)"
       "    (throw e)))"))

(defn wrap-code-for-dirac [code-string]
  (let [wrapped-code (string/replace code-template "{code}" code-string)]
    wrapped-code))