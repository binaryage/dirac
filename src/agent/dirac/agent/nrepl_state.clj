(ns dirac.agent.nrepl-state
  (require [clojure.core.async :refer [chan <!! <! >!! put! alts!! timeout close! go go-loop]]))

(def server->client-chan (chan))                                                                                              ; a queue of messages going from server to client
(def client->server-chan (chan))                                                                                              ; a queue of messages going from client to server

