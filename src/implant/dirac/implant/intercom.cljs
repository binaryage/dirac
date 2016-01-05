(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [chromex.logging :refer-macros [log warn error]]))

(def weasel-options
  {:verbose true
   :print   #{:repl :console}})

(def tunnel-options
  {:verbose         true
   :auto-reconnect? true})

(defn connect-to-weasel-server [url]
  (weasel-client/connect! url weasel-options))

(defn connect-to-nrepl-tunnel-server [url]
  (nrepl-tunnel-client/connect! url tunnel-options))

(defn send-eval-request! [command-id code]
  (nrepl-tunnel-client/tunnel-message! {:op    "eval"
                                        :dirac "wrap"
                                        :id    command-id
                                        :code  code}))

; -- message processing -----------------------------------------------------------------------------------------------------

(defmethod nrepl-tunnel-client/process-message :connect-weasel [message]
  (let [{:keys [server-url]} message]
    (assert server-url ":connect-weasel message must contain weasel server-url")
    (connect-to-weasel-server server-url)
    (go
      {:op :weasel-connected})))