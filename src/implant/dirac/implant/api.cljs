(ns dirac.implant.api
  (:require [dirac.implant.editor :as editor]
            [dirac.implant.client :as client]
            [chromex.logging :refer-macros [log warn error]]
            [clojure.string :as string]))

(def direct-connections (atom {}))

(defn add-connection! [connection-id socket]
  (swap! direct-connections assoc connection-id socket))

(defn remove-connection! [connection-id]
  (swap! direct-connections dissoc connection-id))

(defn ^:export adopt-prompt-element [text-area-element use-parinfer?]
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))

(def ^:dynamic deliver-message-code-template
  "figwheel.client.socket.deliver_message_BANG_({serialized-message-string})")

(defn deliver-message-to-figwheel! [serialized-figwheel-msg]
  (let [code (-> deliver-message-code-template
                 (string/replace "{serialized-message-string}" (js/dirac.codeAsString serialized-figwheel-msg)))]
    (log "delivermsg" code)
    (js/dirac.evalInCurrentContext code)))

(defn process-message [msg cb]
  (let [command (:command msg)]
    (log "process-message" command msg)
    (case command
      "deliver-figwheel-message" (deliver-message-to-figwheel! (:figwheel-message msg))
      (error "received unknown command" command msg))))

(defn connection-handler [cb msg]
  (let [{:keys [op]} msg]
    (case op
      :message (process-message (:payload msg) cb)
      :open (log "connection openned")
      :error (log "connection error" msg))))

(defn ^:export open-direct-connection [connection-id cb]
  (let [url "ws://localhost:7000/repl-driver-ws"]
    (if-let [socket (client/connect url connection-id (partial connection-handler cb))]
      (add-connection! connection-id socket))))

(defn ^:export close-direct-connection [connection-id]
  (let [socket (get @direct-connections connection-id)]
    (client/disconnect socket)
    (remove-connection! connection-id)))