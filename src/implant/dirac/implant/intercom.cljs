(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.reader :refer [read-string]]
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

; When we connect to freshly open nREPL session, cljs REPL is not boostrapped (google "nREPL piggieback" for more details).
(defmethod nrepl-tunnel-client/process-message :bootstrap [client _message]
  (go
    (let [response (<! (nrepl-tunnel-client/tunnel-message-with-response! (nrepl-tunnel-client/boostrap-cljs-repl-message)))]
      (case (:status response)
        ["done"] {:op :bootstrap-done}
        ["timeout"] {:op :bootstrap-timeout}
        {:op :bootstrap-error}))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (.log js/console "!!! got" message)
  (let [{:keys [server-url ns]} message]
    (if server-url
      (connect-to-weasel-server server-url)))
  nil)