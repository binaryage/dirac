(ns dirac.tests.browser.tasks.transcript-streamer-server
  (:require [clojure.tools.logging :as log]
            [dirac.settings :refer [get-transcript-streamer-server-host get-transcript-streamer-server-port]]
            [dirac.lib.ws-server :as ws-server]))

(defonce current-server (volatile! nil))

; -- transcript-streamer server ---------------------------------------------------------------------------------------------

(defn publish! [msg]
  (let [{:keys [text]} msg]
    (log/info text)))

(defn on-message-handler [_server _client msg]
  (log/debug "transcript-streamer server: got transcript-streamer message" msg)
  (case (:op msg)
    :ready nil                                                                                                                ; ignore
    :publish (publish! msg)
    (log/error "transcript-streamer server: received unrecognized message" msg)))

(defn create-transcript-streamer-server! []
  (log/debug "transcript-streamer server: creating server")
  (assert (not @current-server))
  (vreset! current-server (ws-server/create! {:name       "Transcript Streamer (server)"
                                              :host       (get-transcript-streamer-server-host)
                                              :port       (get-transcript-streamer-server-port)
                                              :on-message on-message-handler})))

(defn destroy-transcript-streamer-server! []
  (log/debug "transcript-streamer server: destroying server")
  (assert @current-server)
  (ws-server/destroy! @current-server))

(defn with-transcript-streamer-server [f]
  (create-transcript-streamer-server!)
  (f)
  (destroy-transcript-streamer-server!))
