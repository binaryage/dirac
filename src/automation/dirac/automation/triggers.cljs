(ns dirac.automation.triggers
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs.core.async :refer [timeout]]
            [dirac.automation.scenario :as scenario]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn safe-reload! []
  (go
    (<! (timeout 1000))                                                                                                       ; revent "Cannot find context with specified id" V8 errors ?
    (js/window.location.reload)))

; -- triggers installers ----------------------------------------------------------------------------------------------------

(defn install-reload! []
  (scenario/register-trigger! :reload safe-reload!))

(defn install-navigate! []
  (scenario/register-trigger! :navigate #(set! js/window.location.pathname %)))

(defn install-eval! []
  (scenario/register-trigger! :eval-cljs #(js/dirac.runtime.repl.request-eval-cljs %))
  (scenario/register-trigger! :eval-js #(js/dirac.runtime.repl.request-eval-js %)))

; -- common trigger groups --------------------------------------------------------------------------------------------------

(defn install-common-triggers! []
  (install-reload!)
  (install-navigate!)
  (install-eval!))

