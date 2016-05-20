(ns dirac.background.state
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [devtools.toolbox :as toolbox]
            [dirac.utils :as utils]))

(defonce initial-state
  {:last-devtools-id     0
   :devtools-descriptors {}                                                                                                   ; pairings between dirac devtools instances and connected backend tabs
   :chrome-event-channel nil
   :marion-port          nil})

(defonce state (atom initial-state))

; -- chrome-event-channel ---------------------------------------------------------------------------------------------------

(defn set-chrome-event-channel! [new-channel]
  (swap! state assoc :chrome-event-channel new-channel))

(defn get-chrome-event-channel []
  (:chrome-event-channel @state))

; -- devtools descriptors ---------------------------------------------------------------------------------------------------

(defn get-devtools-descriptors []
  (:devtools-descriptors @state))

(defn add-devtools-descriptor! [id descriptor]
  {:pre [(integer? id)]}
  (swap! state update :devtools-descriptors assoc id descriptor))

(defn remove-devtools-descriptor! [id]
  (swap! state update :devtools-descriptors dissoc id))

(defn get-devtools-descriptor [id]
  (let [descriptors (get-devtools-descriptors)]
    (get descriptors (utils/parse-int id))))

; -- devtools ids -----------------------------------------------------------------------------------------------------------

(defn get-next-devtools-id! []
  (:last-devtools-id (swap! state update :last-devtools-id inc)))

(defn get-last-devtools-id []
  (:last-devtools-id @state))

(defn reset-devtools-id-counter! []
  (if-not (zero? (count (get-devtools-descriptors)))
    (warn "request to reset devtools descriptor id counter while having connections present" (get-devtools-descriptors)))
  (swap! state assoc :last-devtools-id 0))

; -- marion-port ------------------------------------------------------------------------------------------------------------

(defn set-marion-port! [new-marion-port]
  (swap! state assoc :marion-port new-marion-port))

(defn get-marion-port []
  (:marion-port @state))

(defn marion-present? []
  (some? (get-marion-port)))

; -- marion feedback --------------------------------------------------------------------------------------------------------

(defn post-to-marion! [message]
  (if-let [marion-port (get-marion-port)]
    (post-message! marion-port message)
    (warn "marion not yet connected when called post-to-marion! with message:" (toolbox/envelope message))))

(defn post-feedback! [text]
  (post-to-marion! #js {:type "feedback-from-extension" :transcript text}))

(defn post-reply!
  ([message-id] (post-reply! message-id nil))
  ([message-id data]
   (let [message #js {:type "reply" :id message-id}]
     (if data
       (oset message ["data"] (pr-str data)))
     (post-to-marion! message))))