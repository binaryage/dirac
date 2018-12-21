(ns dirac.lib.nrepl-tunnel
  (:require [clojure.core.async :refer [<! <!! >!! alts!! chan close! go go-loop put! timeout]]
            [clojure.core.async.impl.protocols :as core-async]
            [clojure.data]
            [clojure.tools.logging :as log]
            [dirac.lib.nrepl-client :as nrepl-client]
            [dirac.lib.nrepl-protocols :refer [NREPLTunnelService]]
            [dirac.lib.nrepl-tunnel-server :as nrepl-tunnel-server]
            [dirac.lib.utils :as utils]
            [dirac.lib.version :as lib]
            [version-clj.core :refer [version-compare]]))

; Unfortunately, we cannot easily implement full-blown nREPL client in Dirac DevTools.
; First, we don't have real sockets API, we can use only websockets from javascript.
; Second, we don't have libraries like bencode or nrepl on javascript side.
; To implement full nREPL client, we would have to re-implement them from scratch.
;
; Instead we decided to run nREPL client in Clojure on server-side and open a rather dumb websocket tunnel
; to expose nREPL functionality to Dirac DevTools.
;
; The tunnel maintains two things:
; 1) nrepl-client (an active client nREPL connection implemented using nrepl)
; 2) nrepl-tunnel-server (a websocket connection to Dirac DevTools for tunneling messages between nREPL and Dirac REPL)
;
; High level mental model:
; [ nREPL server]  <-s->  [============ our tunnel ==================]  <-ws->  [ Dirac DevTools REPL ]
;
; Implementation details:
;        ?         <-s->  [ nREPL client ] <-> [ nREPL tunnel server ]  <-ws->  [ nREPL tunnel client ]
;
; <-s->  is a socket connection
; <->    is a direct in-process connection (we use core.async channels there)
; <-ws-> is a websocket connection
;
; Tunnel implementation should be robust, client-side (Dirac) endpoint can connect and go-away at any point (browser refresh).
; nREPL client session should persist between reconnections.
;
; Tunnel allows one-to-many scenario, where multiple Dirac DevTools instances can connect to a singe Dirac Agent which talks
; to a single nREPL server. Each Dirac DevTools instance is assigned its own nREPL session, so they can use a single nREPL
; server and they don't step on each others' toes. Thanks to this you can open multiple pages with different Dirac DevTools
; and they all can have their own independent REPLs.
;
; So the multi-client scenario can look like this:
;                                                                       <-ws->  [ nREPL tunnel client #1 ]
;       ...        <-s->  [ nREPL client ] <-> [ nREPL tunnel server ]  <-ws->  [ nREPL tunnel client #2 ]
;                                                                       <-ws->  [ nREPL tunnel client #3 ]

(def nrepl-setup-doc-url "https://github.com/binaryage/dirac#start-nrepl-server")
(def agent-setup-doc-url "https://github.com/binaryage/dirac#start-dirac-agent")

(defn ^:dynamic missing-nrepl-middleware-msg [url]
  (str "Dirac nREPL middleware is not present in your nREPL server at " url "!\n"
       "Didn't you forget to add :nrepl-middleware [dirac.nrepl/middleware] to your :repl-options?\n"
       "Please follow Dirac installation instructions: " nrepl-setup-doc-url "."))

(defn ^:dynamic old-nrepl-middleware-msg [expected-version reported-version]
  (str "The version of Dirac nREPL middleware is old. "
       "Expected '" expected-version "', got '" reported-version "'.\n"
       "You should review your nREPL server setup and bump binaryage/dirac version to '" expected-version "'.\n"
       "Please follow Dirac installation instructions: " nrepl-setup-doc-url "."))

(defn ^:dynamic unknown-nrepl-middleware-msg [expected-version reported-version]
  (str "The version of Dirac nREPL middleware is unexpectedly recent. "
       "Expected '" expected-version "', got '" reported-version "'.\n"
       "You should review your Dirac Agent setup and bump binaryage/dirac version to '" reported-version "'.\n"
       "Please follow Dirac installation instructions: " agent-setup-doc-url "."))

(defn ^:dynamic unexpected-middleware-msg [url versions expected-ops reported-opts]
  (str "We detected unexpected middleware setup in your nREPL server at " url "!\n"
       "The difference (clojure.data/diff expected-ops reported-ops) is:\n"
       (utils/pp (clojure.data/diff expected-ops reported-opts))
       "\n"
       "For reference, the reported versions by the nREPL server are:\n"
       (utils/pp (into (sorted-map) (map (fn [[k v]] [k (:version-string v)]) versions)))
       "\n"
       "This usually happens when some extra middleware gets injected into your nREPL server behind your back.\n"
       "e.g. * Didn't you include a middleware via ~/.lein/profiles.clj or BOOT_HOME/boot.properties?\n"
       "     * Or maybe using Cider's nREPL stuff?\n"
       "     * Or maybe using some combination of ancient Clojure/Java versions?\n"
       "     * Or some bleeding-edge alpha versions?\n"
       "     * Or a rogue tools.nrepl dependency in your project or its dependencies?\n"
       "\n"
       "Please follow Dirac installation instructions: " nrepl-setup-doc-url "."))

(defn ^:dynamic unexpected-tools-nrepl-version-msg [url versions reported-version expected-version]
  (str "We detected unexpected tools.nrepl library version in your nREPL server at " url "!\n"
       "The server reported version " reported-version ", but Dirac expected version " expected-version ".\n"
       "This could potentialy lead to unexpected behaviour. Please check your dependencies and use latest Dirac release.\n"
       "\n"
       "For reference, the reported versions by the nREPL server are:\n"
       (utils/pp (into (sorted-map) (map (fn [[k v]] [k (:version-string v)]) versions)))
       "\n"
       "Also double check Dirac installation instructions: " nrepl-setup-doc-url "."))

(def ^:dynamic expected-nrepl-version "0.5.3")
(def ^:dynamic expected-nrepl-middleware-ops
  (list :clone :close :describe :dirac-devtools-request :eval :identify-dirac-nrepl-middleware :interrupt :load-file
        :ls-sessions :stdin))

; -- NREPLTunnel constructor ------------------------------------------------------------------------------------------------

(declare deliver-server-message!)
(declare deliver-client-message!)
(declare open-session!)
(declare close-session!)

(defrecord NREPLTunnel [id options nrepl-client nrepl-tunnel-server server-messages-channel client-messages-channel
                        server-messages-done-promise client-messages-done-promise]
  NREPLTunnelService                                                                                                          ; in some cases nrepl-client and nrepl-tunnel-server need to talk to their tunnel
  (open-session [this]
    (open-session! this))
  (close-session [this session]
    (close-session! this session))
  (deliver-message-to-server! [this message]
    (deliver-server-message! this message))
  (deliver-message-to-client! [this message]
    (deliver-client-message! this message))

  Object
  (toString [this]
    (str "[NREPLTunnel#" (:id this) "]")))

(defonce last-id (volatile! 0))

(defn next-id! []
  (vswap! last-id inc))

(defn make-tunnel! [options]
  (let [tunnel (NREPLTunnel. (next-id!) options (atom nil) (atom nil) (atom nil) (atom nil) (promise) (promise))]
    (log/trace "Made" (str tunnel))
    tunnel))

; -- NREPLTunnel getters/setters --------------------------------------------------------------------------------------------

(defn get-server-messages-channel [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:server-messages-channel tunnel))

(defn set-server-messages-channel! [tunnel channel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:server-messages-channel tunnel) channel))

(defn get-client-messages-channel [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:client-messages-channel tunnel))

(defn set-client-messages-channel! [tunnel channel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:client-messages-channel tunnel) channel))

(defn get-nrepl-tunnel-server [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:nrepl-tunnel-server tunnel))

(defn set-nrepl-tunnel-server! [tunnel server]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:nrepl-tunnel-server tunnel) server))

(defn get-nrepl-client [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  @(:nrepl-client tunnel))

(defn set-nrepl-client! [tunnel client]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (reset! (:nrepl-client tunnel) client))

(defn get-client-messages-done-promise [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (:client-messages-done-promise tunnel))

(defn get-server-messages-done-promise [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (:server-messages-done-promise tunnel))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-tunnel-info [tunnel]
  {:pre [(instance? NREPLTunnel tunnel)]}
  (let [tunnel-server (get-nrepl-tunnel-server tunnel)
        tunnel-url (nrepl-tunnel-server/get-server-url tunnel-server)
        nrepl-client (get-nrepl-client tunnel)
        client-info (nrepl-client/get-client-info nrepl-client)]
    (str client-info "\n"
         "Agent is accepting connections at " tunnel-url ".")))

; -- sessions ---------------------------------------------------------------------------------------------------------------

(defn open-session! [tunnel]
  (let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/open-session nrepl-client)))

(defn close-session! [tunnel session]
  (let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/close-session nrepl-client session)))

; -- tunnel message channels ------------------------------------------------------------------------------------------------
;
; When nREPL client receives a message fron nREPL server, we don't send the message immediatelly through the tunnel.
; Instead we put! it into server-messages-channel and run independent processing loop to consume this channel
; and feed the tunnel sequentially.
;
; It works similar way in the other direction. When tunnel client sends a message and we receive it in our tunnel server,
; we don't immediatelly call nrepl-client/send!, instead we put! the message onto client-messages-channel and
; let client-messages processing loop consume it and send it to nREPL client.
;
; Using channels has two main advantages:
; 1) if needed, we could transparently inject any message transformation into channels (a channel transducer)
; 2) channels have buffering controls
;

(defn deliver-server-message! [tunnel message]
  (when-some [channel (get-server-messages-channel tunnel)]                                                                   ; we silently ignore messages when channel is not yet set (during initialization)
    (let [receipt (promise)]
      (if (core-async/closed? channel)
        (log/warn (str tunnel) (str "An attempt to enqueue a message for nREPL server, but channel was already closed! => ignored\n")
                  (utils/pp message))
        (log/trace (str tunnel) (str "Enqueue message " (utils/sid message) " to be sent to nREPL server:\n")
                   (utils/pp message)))
      (put! channel [message receipt])
      receipt)))

(defn run-server-messages-channel-processing-loop! [tunnel]
  (log/debug (str tunnel) "Starting server-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-server-messages-channel tunnel)]
      (if-some [[message receipt] (<! messages-chan)]
        (let [client (get-nrepl-client tunnel)]
          (deliver receipt (nrepl-client/send! client message))
          (log/trace (str tunnel) (str "Sent message " (utils/sid message) " to nREPL server"))
          (recur))
        (do
          (log/debug (str tunnel) "Exitting server-messages-channel-processing-loop")
          (deliver (get-server-messages-done-promise tunnel) true))))))

(defn deliver-client-message! [tunnel message]
  (when-some [channel (get-client-messages-channel tunnel)]                                                                   ; we silently ignore messages when channel is not yet set (during initialization)
    (let [receipt (promise)]
      (if (core-async/closed? channel)
        (log/warn (str tunnel) (str "An attempt to enqueue a message for DevTools client, but channel was already closed! => ignored\n")
                  (utils/pp message))
        (log/trace (str tunnel) (str "Enqueue message " (utils/sid message) " to be sent to a DevTools client via tunnel:\n")
                   (utils/pp message)))
      (put! channel [message receipt])
      receipt)))

(defn run-client-messages-channel-processing-loop! [tunnel]
  (log/debug (str tunnel) "Starting client-messages-channel-processing-loop")
  (go-loop []
    (let [messages-chan (get-client-messages-channel tunnel)]
      (if-some [[message receipt] (<! messages-chan)]
        (let [server (get-nrepl-tunnel-server tunnel)]
          (deliver receipt (nrepl-tunnel-server/dispatch-message! server message))
          (log/trace (str tunnel) (str "Dispatched message " (utils/sid message) " to tunnel"))
          (recur))
        (do
          (log/debug (str tunnel) "Exitting client-messages-channel-processing-loop")
          (deliver (get-client-messages-done-promise tunnel) true))))))

; -- NREPLTunnel life cycle -------------------------------------------------------------------------------------------------

(defn identify-dirac-nrepl-middleware! [nrepl-client]
  (log/trace "check-nrepl-middleware! lib-version" lib/version)
  (let [response (<!! (nrepl-client/send! nrepl-client {:op "identify-dirac-nrepl-middleware"}))
        {:keys [version]} response]
    (log/debug "identify-dirac-nrepl-middleware response:" response)
    (if (some? version)
      (case (version-compare lib/version version)
        -1 [::unknown (unknown-nrepl-middleware-msg lib/version version)]
        1 [::old (old-nrepl-middleware-msg lib/version version)]
        0 [::ok])
      [::missing (missing-nrepl-middleware-msg (nrepl-client/get-server-connection-url nrepl-client))])))

(defn dirac-nrepl-middleware-check! [nrepl-client]
  (let [[status message] (identify-dirac-nrepl-middleware! nrepl-client)]
    (case status
      ::missing (utils/exit-with-error! message 77)
      (::old ::unknown) (utils/print-warning! message)
      ::ok nil)))

(defn describe-middleware-setup! [nrepl-client expected-ops]
  (log/trace "describe-middleware-setup! lib-version" lib/version)
  (let [response (<!! (nrepl-client/send! nrepl-client {:op "describe"}))
        {:keys [ops versions]} response
        reported-ops (sort (keys ops))
        nrepl-version (:version-string (:nrepl versions))
        server-url (nrepl-client/get-server-connection-url nrepl-client)]
    (log/debug "describe response:" response)
    (cond
      (not= nrepl-version expected-nrepl-version)
      [::bad-nrepl-version (unexpected-tools-nrepl-version-msg server-url versions nrepl-version expected-nrepl-version)]

      (not= reported-ops expected-ops)
      [::unexpected-setup (unexpected-middleware-msg server-url versions expected-ops reported-ops)]

      :else
      [::ok nil])))

(defn paranoid-middleware-setup-check! [nrepl-client expected-ops]
  (let [[status message] (describe-middleware-setup! nrepl-client expected-ops)]
    (case status
      ::unexpected-setup (utils/print-warning! message)
      ::bad-nrepl-version (utils/print-warning! message)
      ::ok nil)))

(defn create! [options]
  (let [tunnel (make-tunnel! options)
        server-messages (chan)
        client-messages (chan)]
    (let [nrepl-client (nrepl-client/create! tunnel (:nrepl-server options))]
      (when-not (:skip-paranoid-middleware-setup-check options)
        (paranoid-middleware-setup-check! nrepl-client expected-nrepl-middleware-ops))
      (when-not (:skip-dirac-nrepl-middleware-check options)
        (dirac-nrepl-middleware-check! nrepl-client))
      (let [nrepl-tunnel-server (nrepl-tunnel-server/create! tunnel (:nrepl-tunnel options))]
        (set-nrepl-client! tunnel nrepl-client)
        (set-server-messages-channel! tunnel server-messages)
        (set-client-messages-channel! tunnel client-messages)
        (set-nrepl-client! tunnel nrepl-client)
        (set-nrepl-tunnel-server! tunnel nrepl-tunnel-server)
        (run-server-messages-channel-processing-loop! tunnel)
        (run-client-messages-channel-processing-loop! tunnel)
        (log/debug "Created" (str tunnel) (utils/pp options))
        tunnel))))

(defn destroy! [tunnel]
  (log/trace "Destroying" (str tunnel))
  (when-let [nrepl-tunnel-server (get-nrepl-tunnel-server tunnel)]
    (nrepl-tunnel-server/disconnect-all-clients! nrepl-tunnel-server)
    (Thread/sleep 1000)                                                                                                       ; wait for responses from closed nREPL sessions
    (close! (get-client-messages-channel tunnel))
    @(get-client-messages-done-promise tunnel)
    (nrepl-tunnel-server/destroy! nrepl-tunnel-server)
    (set-nrepl-tunnel-server! tunnel nil))
  (close! (get-server-messages-channel tunnel))
  @(get-server-messages-done-promise tunnel)
  (when-let [nrepl-client (get-nrepl-client tunnel)]
    (nrepl-client/destroy! nrepl-client)
    (set-nrepl-client! tunnel nil))
  (set-client-messages-channel! tunnel nil)
  (set-server-messages-channel! tunnel nil)
  (log/debug "Destroyed" (str tunnel))
  true)
