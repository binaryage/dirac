(ns dirac.tests.scenarios.old-runtime
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [clojure.string :as string]))

(defn replace-versions [s]
  (string/replace s #"\(v.*?\)" "**VERSION**"))

(defn transformer [console-output]
  (-> console-output
      replace-versions))

(init-runtime! {:old-runtime true})
(scenario/capture-console-as-feedback!)
(scenario/register-feedback-transformer! transformer)
(scenario/ready!)
