(ns dirac.tests.tasks.helpers.open-scenario
  (:require [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools] :as a]
            [dirac.automation.helpers :as helpers]))

; this is a helper task to open a scenario with proper dirac extension setup
; it is used on index page to provide handy links to individual scenarios for convenience during development
; this task is not part of standard test suites

(go-task
  (let [scenario-name (helpers/get-document-url-param "scenario")]
    (assert scenario-name "please pass some 'scenario' param to this task via url query string")
    (<!* a/open-scenario! scenario-name)))
