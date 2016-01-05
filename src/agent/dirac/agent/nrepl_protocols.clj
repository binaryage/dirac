(ns dirac.agent.nrepl-protocols)

(defprotocol NREPLTunnelService
  (bootstrapped? [this])                                                                                                      ; was nREPL client already bootstrapped?
  (deliver-server-message! [this message])
  (deliver-client-message! [this message]))