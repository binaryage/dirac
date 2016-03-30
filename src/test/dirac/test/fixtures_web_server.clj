(ns dirac.test.fixtures-web-server
  (:use ring.middleware.resource
        ring.middleware.content-type
        ring.middleware.not-modified
        ring.middleware.reload))

(def default-options
  {:port  9090
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
    (run-jetty (wrap-reload (get-fixtures-server)) (merge default-options options))))

(defn stop-fixtures-web-server [server]
  (.stop server))

(defn with-fixtures-web-server [f]
  (let [server (start-fixtures-web-server)]
    (f)
    (stop-fixtures-web-server server)))