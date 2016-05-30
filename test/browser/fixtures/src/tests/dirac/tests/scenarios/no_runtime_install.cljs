(ns dirac.tests.scenarios.no-runtime-install
  (:require [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.runtime :as runtime]))

(defn test-if-installed []
  (scenario/feedback! (str "(dirac.runtime/installed?) => " (runtime/installed?)))
  (scenario/feedback! (str "(dirac.runtime/installed? :repl) => " (runtime/installed? :repl)))
  (scenario/feedback! (str "(dirac.runtime/installed? [:repl]) => " (runtime/installed? [:repl]))))

(init-runtime! {:do-not-install-runtime true})
(scenario/register-trigger! :test-if-installed test-if-installed)
(scenario/ready!)

(scenario/feedback! "test immediate feedback")