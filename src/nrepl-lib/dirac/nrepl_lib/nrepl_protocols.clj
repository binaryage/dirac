(ns dirac.nrepl-lib.nrepl-protocols)

(defprotocol NREPLTunnelService
  (open-session [this])
  (close-session [this session])
  (deliver-message-to-server! [this message])
  (deliver-message-to-client! [this message]))
