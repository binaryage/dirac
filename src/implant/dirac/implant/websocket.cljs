;;  Copyright (c) Rich Hickey. All rights reserved.
;;  The use and distribution terms for this software are covered by the
;;  Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
;;  which can be found in the file epl-v10.html at the root of this distribution.
;;  By using this software in any fashion, you are agreeing to be bound by
;;  the terms of this license.
;;  You must not remove this notice, or any other, from this software.

(ns weasel.impls.websocket
  (:require [clojure.browser.net :as net :refer [IConnection connect transmit]]
            [clojure.browser.event :as event :refer [event-types]]
            [goog.net.WebSocket :as gwebsocket]))

(defprotocol IWebSocket
  (open? [this]))

(defn websocket-connection
  ([]
     (websocket-connection nil nil))
  ([auto-reconnect?]
     (websocket-connection auto-reconnect? nil))
  ([auto-reconnect? next-reconnect-fn]
     (goog.net.WebSocket. auto-reconnect? next-reconnect-fn)))

(extend-type goog.net.WebSocket
  IWebSocket
  (open? [this]
    (.isOpen this ()))

  net/IConnection
  (connect
    ([this url]
       (connect this url nil))
    ([this url protocol]
       (.open this url protocol)))

  (transmit [this message]
    (.send this message))

  (close [this]
    (.close this ()))

  event/IEventType
  (event-types [this]
    (into {}
      (map
        (fn [[k v]]
          [(keyword (. k (toLowerCase)))
           v])
        (merge
          (js->clj goog.net.WebSocket/EventType))))))
