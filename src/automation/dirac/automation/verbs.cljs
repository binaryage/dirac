(ns dirac.automation.verbs
  "Low-level automation API"
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log error]]
            [dirac.automation.transcript-host :as transcript]
            [dirac.automation.matchers :as matchers]
            [dirac.automation.messages :as messages]))

; -- automation lower-level support -----------------------------------------------------------------------------------------

(defn automate-dirac-frontend! [devtools-id data]
  (messages/automate-dirac-frontend! devtools-id data))

(defn wait-for-match [what & args]
  (let [matcher (matchers/make-generic-matcher what)
        description (matchers/get-generic-matcher-description what)]
    (apply transcript/wait-for-match matcher description args)))

(defn wait-for-devtools-match [devtools-id what & args]
  (let [matcher (matchers/make-and-matcher (matchers/make-devtools-matcher devtools-id)
                                           (matchers/make-generic-matcher what))
        description (str "devtools #" devtools-id ", " (matchers/get-generic-matcher-description what))]
    (apply transcript/wait-for-match matcher description args)))

(defn wait-for-devtools-ready [devtools-id]
  (wait-for-devtools-match devtools-id "devtools ready"))

(defn wait-for-panel-switch [devtools-id name]
  (wait-for-devtools-match devtools-id (str "setCurrentPanel: " name)))

(defn wait-for-devtools-boot [devtools-id]
  (go
    (<! (wait-for-devtools-ready devtools-id))
    (<! (wait-for-panel-switch devtools-id "elements"))                                                                       ; because we have reset all devtools settings, the first landed panel will be "elements"
    (<! (wait-for-devtools-match devtools-id "namespacesCache is cool now"))))                                                ; we need namespaces cache to be fully populated to prevent flaky tests

(defn wait-for-devtools-unregistration [devtools-id]
  (wait-for-match (str "unregister devtools #" devtools-id)))
