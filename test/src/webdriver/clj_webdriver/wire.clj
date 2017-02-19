;; JsonWireProtocol work
(ns clj-webdriver.wire
  (:use [cheshire.core :only [parse-string]]
        [clojure.walk :only [keywordize-keys]])
  (:require [clj-http.client :as client]
            [clj-webdriver.remote.server :as rs]
            [clojure.string :as string])
  (:import clj_webdriver.remote.server.RemoteServer))

(def default-wd-url "http://localhost:3001/wd/")

(defn parse-body
  "Body comes back as JSON per protocol. Parse it."
  [resp]
  (parse-string (:body resp)))

(defprotocol IWire
  "JsonWireProtocol support"
  (execute [server commands])
  (status [server]))

(extend-type RemoteServer
  
  IWire
  (execute [server commands]
    (let [commands (if-not (vector? commands)
                    (vector commands)
                    commands)
          resp (client/get (str (rs/address server)
                                (string/join "/" commands)))
          body (parse-body resp)]
      (keywordize-keys (assoc resp :body body))))

  (status [server]
    (execute server ["status"])))

(comment
  ;; The following shows an example of using the JsonWireProtocol directly,
  ;; as well as a "traditional" example using the clj-webdriver core API.
  ;;
  ;; The following would execute /session/:sessionId/url to get the
  ;; current URL of the driver. The response is a JSON object
  ;; that conforms to the JsonWireProtocol spec detailed here:
  ;; http://code.google.com/p/selenium/wiki/JsonWireProtocol
  (let [[server driver] (rs/new-remote-session)
        session-id (clj-webdriver.remote-driver/session-id driver)
        url (execute server ["session" session-id "url"])]
    (clj-webdriver.core/to driver "https://github.com")))