(ns dirac.tests.scenarios.normal-via-preloads
  (:require [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario]
            [dirac.runtime :as dirac-runtime]))

(defn check-runtime-installed []
  (.log js/console (str "runtime installed? " (dirac-runtime/installed?))))

(defn check-runtime-config []
  (.log js/console (str ":external-config-setting is '" (:external-config-setting (dirac-runtime/get-prefs)) "'")))

; note that dirac.runtime should be initialized via preloads
; see :scenarios02 build in project.clj - we use :main and :preloads there
#_(init-runtime!)
(scenario/capture-console-as-feedback!)
(scenario/register-trigger! :check-runtime-installed check-runtime-installed)
(scenario/register-trigger! :check-runtime-config check-runtime-config)
(scenario/ready!)
