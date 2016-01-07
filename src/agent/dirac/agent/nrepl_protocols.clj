(ns dirac.agent.nrepl-protocols)

(defprotocol NREPLTunnelService
  (open-session [this])
  (close-session [this session])
  (get-weasel-server-url [this])
  (bootstrapped? [this])                                                                                                      ; was nREPL client already bootstrapped?
  (deliver-message-to-server! [this message])
  (deliver-message-to-client! [this message]))