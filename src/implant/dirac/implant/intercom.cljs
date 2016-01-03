(ns dirac.implant.intercom
  (:require [dirac.implant.weasel-client :as weasel-client]
            [dirac.implant.nrepl-tunnel-client :as nrepl-tunnel-client]
            [chromex.logging :refer-macros [log warn error]]))

(def weasel-options
  {:verbose true
   :print   #{:repl :console}})

(defn connect-to-weasel-server [url]
  (weasel-client/connect! url weasel-options))

(defn connect-to-nrepl-tunnel-server [url]
  (nrepl-tunnel-client/connect! url weasel-options))

(defn send-to-nrepl-tunnel! [tunnel-op msg]
  (nrepl-tunnel-client/send! {:op       tunnel-op
                              :envelope msg}))

(defn send-eval-request! [command-id code]
  (send-to-nrepl-tunnel! :nrepl-message {:op   "eval"
                                         :id   command-id
                                         :code code}))