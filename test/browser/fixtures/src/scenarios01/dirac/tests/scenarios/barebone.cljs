(ns dirac.tests.scenarios.barebone
  (:require [cljs.core.async :refer [go <!]]
            [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]))

(defn test-trigger []
  (scenario/go-post-feedback! "feedback from trigger"))

(scenario/register-trigger! :test-trigger test-trigger)

(go
  (<! (scenario/go-ready!))
  (<! (scenario/go-post-feedback! "immediate feedback")))
