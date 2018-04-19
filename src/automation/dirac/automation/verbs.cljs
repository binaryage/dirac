(ns dirac.automation.verbs
  "Low-level automation API"
  (:require [dirac.automation.logging :refer [error log]]
            [dirac.automation.matchers :as matchers]
            [dirac.automation.messages :as messages]
            [dirac.automation.transcript-host :as transcript]
            [dirac.shared.async :refer [<! go go-channel put!]]
            [oops.core :refer [oapply ocall oget oset!]]))

; -- automation lower-level support -----------------------------------------------------------------------------------------

(defn go-automate-devtools! [devtools-id data]
  (messages/go-automate-dirac-frontend! devtools-id data))

(defn go-wait-for-match [what & args]
  (let [matcher (matchers/make-generic-matcher what)
        description (matchers/get-generic-matcher-description what)]
    (apply transcript/go-wait-for-match matcher description args)))

(defn go-wait-for-devtools-match [devtools-id what & args]
  (let [matcher (matchers/make-and-matcher (matchers/make-devtools-matcher devtools-id)
                                           (matchers/make-generic-matcher what))
        description (str "devtools #" devtools-id ", " (matchers/get-generic-matcher-description what))]
    (apply transcript/go-wait-for-match matcher description args)))

(defn go-wait-for-devtools-ready [devtools-id]
  (go-wait-for-devtools-match devtools-id "devtools ready"))

(defn go-wait-for-panel-switch [devtools-id name]
  (go-wait-for-devtools-match devtools-id (str "setCurrentPanel: " name)))

(defn go-wait-for-devtools-boot [devtools-id]
  (go
    (<! (go-wait-for-devtools-ready devtools-id))
    (<! (go-wait-for-panel-switch devtools-id "elements"))                                                                    ; because we have reset all devtools settings, the first landed panel will be "elements"
    (<! (go-wait-for-devtools-match devtools-id "namespacesCache is cool now"))))                                             ; we need namespaces cache to be fully populated to prevent flaky tests

(defn wait-for-devtools-unregistration [devtools-id]
  (go-wait-for-match (str "unregister devtools #" devtools-id)))
