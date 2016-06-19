(ns dirac.tests.scenarios.exception
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.tests.scenarios.exception.core :as core]
            [dirac.automation.scenario :as scenario]))

(init-runtime!)
(scenario/register-trigger! :cause-exception #(core/exception-demo-handler))
(scenario/ready!)
