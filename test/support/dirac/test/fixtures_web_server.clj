(ns dirac.test.fixtures-web-server
  (:use ring.adapter.jetty
        ring.middleware.resource
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

(def fixtures-server
  (-> handler
      (wrap-resource "browser-fixtures")
      (wrap-content-type)
      (wrap-not-modified)))

(defn start-fixtures-web-server [& [options]]
  (run-jetty (wrap-reload fixtures-server) (merge default-options options)))

(defn stop-fixtures-web-server [server]
  (.stop server))

(defn with-fixtures-web-server [f]
  (let [server (start-fixtures-web-server)]
    (f)
    (stop-fixtures-web-server server)))