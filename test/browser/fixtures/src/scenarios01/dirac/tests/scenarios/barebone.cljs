(ns dirac.tests.scenarios.barebone
  (:require [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.shared.async :refer [<! go]]))

(defn test-trigger []
  (scenario/go-post-feedback! "feedback from trigger"))

(scenario/register-trigger! :test-trigger test-trigger)

(go
  (<! (scenario/go-ready!))
  (<! (scenario/go-post-feedback! "immediate feedback")))
