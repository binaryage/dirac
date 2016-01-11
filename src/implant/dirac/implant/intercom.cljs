(ns dirac.implant.intercom
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put! timeout close!]]
            [cljs.reader :refer [read-string]]
            [dirac.implant.eval :as eval]
            [dirac.implant.console :as console]
            [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [chromex.logging :refer-macros [log warn error]]))

(def ^:dynamic *repl-connected-and-bootstrapped* false)

(def weasel-options
  {:verbose true
   :print   #{:repl :console}})

(def tunnel-options
  {:verbose         true
   :auto-reconnect? false})

(defn repl-connected? []
  (and *repl-connected-and-bootstrapped*
       (nrepl-tunnel-client/connected?)))

(defn connect-to-weasel-server [url]
  (weasel-client/connect! url weasel-options))

(defn on-error-handler [url _client event]
  (eval/present-output 0 "stderr" (str "Unable to connect to nREPL tunnel at " url)))

(defn connect-to-nrepl-tunnel-server [url]
  (set! *repl-connected-and-bootstrapped* false)
  (try
    (let [options (assoc tunnel-options
                    :on-error (partial on-error-handler url))]
      (nrepl-tunnel-client/connect! url options))
    (catch :default e
      (eval/present-output 0 "stderr" (str "Unable to connect to nREPL tunnel at " url ":\n" e)))))

(defn send-eval-request! [job-id code]
  (when (repl-connected?)
    (console/announce-job-start! job-id)
    (nrepl-tunnel-client/tunnel-message! {:op    "eval"
                                          :dirac "wrap"
                                          :id    job-id
                                          :code  code})))

; -- message processing -----------------------------------------------------------------------------------------------------

; When we connect to freshly open nREPL session, cljs REPL is not boostrapped (google "nREPL piggieback" for more details).
(defmethod nrepl-tunnel-client/process-message :bootstrap [_client _message]
  (go
    (let [response (<! (nrepl-tunnel-client/tunnel-message-with-response! (nrepl-tunnel-client/boostrap-cljs-repl-message)))]
      (case (:status response)
        ["done"] (do
                   (set! *repl-connected-and-bootstrapped* true)
                   {:op :bootstrap-done})
        ["timeout"] (do
                      (eval/present-output 0 "stderr" (str "Unable to bootstrap CLJS REPL. Bootstrapping timeout. "
                                                           "This is usually a case when server side process "
                                                           "raised an exception or crashed. Check your nREPL console."))
                      {:op :bootstrap-timeout})
        (do
          (eval/present-output 0 "stderr" (str "Unable to bootstrap CLJS REPL. Received an error. "
                                               "Check your nREPL console."))
          {:op :bootstrap-error})))))

(defmethod nrepl-tunnel-client/process-message :bootstrap-info [_client message]
  (let [{:keys [server-url ns]} message]
    (assert server-url (str "expected :server-url in :bootstrap-info message" message))
    (assert ns (str "expected :ns in :bootstrap-info message" message))
    (connect-to-weasel-server server-url)
    (console/set-repl-ns! ns))
  nil)