(ns dirac.tests.scenarios.barebone
  (:require [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(defn test-trigger []
  (scenario/feedback! "feedback from trigger"))

(scenario/register-trigger! :test-trigger test-trigger)
(scenario/ready!)

(scenario/feedback! "immediate feedback")
