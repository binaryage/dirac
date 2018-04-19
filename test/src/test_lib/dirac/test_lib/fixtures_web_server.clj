(ns dirac.test-lib.fixtures-web-server
  (:require [clojure.string :as string]
            [clojure.tools.logging :as log]
            [dirac.settings :refer [get-fixtures-server-port get-fixtures-server-url]]
            [dirac.shared.travis :refer [with-travis-fold]]
            [org.httpkit.server :refer [run-server]])
  (:use ring.middleware.content-type
        ring.middleware.not-modified
        ring.middleware.reload
        ring.middleware.resource)
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
  (let [handler (wrap-reload (get-fixtures-server))
        options (merge default-options options)]
    (log/info "starting fixtures web server at" (get-fixtures-server-url))
    (run-server handler options)))

(defn stop-fixtures-web-server [stop-fn]
  (try
    (stop-fn)
    (catch IOException e
      ; see https://bugs.openjdk.java.net/browse/JDK-8050499 - dirty hack for clean shutdown on OSX w/ Java 1.8.0_20
      ; inspired by solution here: https://issues.apache.org/jira/browse/CASSANDRA-8220
      (if-not (string/includes? (.getMessage e) "Unknown error: 316")
        (throw e)))))

(defn with-fixtures-web-server [f]
  (let [server-stop-fn (with-travis-fold "Start fixtures web server" "start-fixtures-web-server"
                         (start-fixtures-web-server))]
    (f)
    (with-travis-fold "Stop fixtures web server" "stop-fixtures-web-server"
      (stop-fixtures-web-server server-stop-fn))))
