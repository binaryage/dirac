(ns dirac.background.state
  (:require [dirac.background.logging :refer [log info warn error]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.protocols :refer [post-message! get-sender get-name]]
            [dirac.shared.utils :as utils]
            [clojure.string :as string]))

(defonce initial-state
  {:last-devtools-id     0
   :devtools-descriptors {}                                                                                                   ; pairings between dirac devtools instances and connected backend tabs
   :chrome-event-channel nil
   :marion-port          nil
   :backend-api          nil
   :backend-css          nil})

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
  (when-not (zero? (count (get-devtools-descriptors)))
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
  (if-some [marion-port (get-marion-port)]
    (post-message! marion-port message)
    (warn "marion not yet connected when called post-to-marion! with message:" message)))

(defn post-feedback! [text]
  (post-to-marion! #js {:type "feedback-from-extension" :transcript text}))

(defn make-reply [data]
  (if (instance? js/Error data)
    (utils/make-error-struct data)
    (try
      (utils/make-result-struct data)
      (catch :default e
        (utils/make-error-struct e)))))

(defn serialize-reply-data [data]
  (try
    (pr-str data)
    (catch :default e
      (pr-str (utils/make-error-struct e)))))

(defn post-raw-reply! [message-id data]
  (let [message #js {:type "reply"
                     :id   message-id
                     :data (serialize-reply-data data)}]
    (post-to-marion! message)))

(defn post-reply!
  ([message-id] (post-reply! message-id nil))
  ([message-id value]
   (post-raw-reply! message-id (make-reply value))))

; -- backend-api ------------------------------------------------------------------------------------------------------------

(defn set-backend-api! [api]
  {:pre [(string? api)]}
  (log (str "initialized backend-api with " (count (string/split-lines api)) " calls"))
  (swap! state assoc :backend-api api))

(defn get-backend-api []
  (:backend-api @state))

; -- backend-css ------------------------------------------------------------------------------------------------------------

(defn set-backend-css! [css]
  {:pre [(string? css)]}
  (log (str "initialized backend-css with " (count (string/split-lines css)) " definitions"))
  (swap! state assoc :backend-css css))

(defn get-backend-css []
  (:backend-css @state))
