(ns dirac.test-lib.fixtures-web-server
  (:require [dirac.settings :refer [get-fixtures-server-port get-fixtures-server-url]]
            [clojure.tools.logging :as log]
            [clojure.string :as string])
  (:use ring.middleware.resource
        ring.middleware.content-type
        ring.middleware.not-modified
        ring.middleware.reload)
  (:import (java.io IOException)))

(def default-options
  {:port  (get-fixtures-server-port)
   :join? false})

(defn handler [_request]
  {:status  200
   :headers {"Content-Type" "text/plain"}
   :body    "fixtures web-server ready"})

(defn get-fixtures-server []
  (-> handler
      (wrap-resource "browser/fixtures/resources")
      (wrap-content-type)
      (wrap-not-modified)))

(defn start-fixtures-web-server [& [options]]
  (require 'ring.adapter.jetty)
  (let [run-jetty (resolve 'ring.adapter.jetty/run-jetty)]
    (log/info "starting fixtures web server at" (get-fixtures-server-url))
    (run-jetty (wrap-reload (get-fixtures-server)) (merge default-options options))))

(defn stop-fixtures-web-server [server]
  (try
    (.stop server)
    (catch IOException e
      ; see https://bugs.openjdk.java.net/browse/JDK-8050499 - dirty hack for clean shutdown on OSX w/ Java 1.8.0_20
      ; inspired by solution here: https://issues.apache.org/jira/browse/CASSANDRA-8220
      (if-not (string/includes? (.getMessage e) "Unknown error: 316")
        (throw e)))))

(defn with-fixtures-web-server [f]
  (let [server (start-fixtures-web-server)]
    (f)
    (stop-fixtures-web-server server)))
