(ns dirac.background.cors
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.config :refer-macros [with-custom-event-listener-factory]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.web-request :as web-request]
            [cljs.core.async :refer [<! chan]]))

(defn cors-event-listener-factory []
  (fn [details]
    (let [url (oget details "url")
          headers (oget details "responseHeaders")]
      (if (re-matches #".*/json" url)
        (let [cors-header #js {"name"  "Access-Control-Allow-Origin"
                               "value" "*"}]
          (.push headers cors-header)))
      #js {"responseHeaders" headers})))

(defn setup-cors-rewriting! []
  ; not needed anymore?
  #_(with-custom-event-listener-factory cors-event-listener-factory
    (web-request/tap-on-headers-received-events (chan) (clj->js {"urls" ["http://*/json"]}) #js ["responseHeaders"])))