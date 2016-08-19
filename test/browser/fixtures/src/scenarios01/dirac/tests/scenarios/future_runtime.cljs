(ns dirac.tests.scenarios.future-runtime
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [clojure.string :as string]))

(defn replace-versions [s]
  (string/replace s #"\(v.*?\)" "**VERSION**"))

(defn transformer [console-output]
  (-> console-output
      replace-versions))

(init-runtime! {:future-runtime true})
(scenario/capture-console-as-feedback!)
(scenario/register-feedback-transformer! transformer)
(scenario/ready!)
