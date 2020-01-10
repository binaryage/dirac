(ns dirac.main.playground
  "Our attempt to provide playground build/repl environment with Dirac runtime"
  (:require [dirac.home.helpers :as helpers]
            [dirac.home.locations :as locations]
            [cljs.build.api :as cljs]
            [nrepl.version]
            [nrepl.server]
            [dirac.agent]
            [dirac.nrepl]
            [clojure.java.io :as io]
            [ring.util.response :refer [not-found]]
            [ring.middleware.defaults :refer [wrap-defaults api-defaults]]
            [clojure.tools.logging :as log]
            [org.httpkit.server :as http]
            [dirac.main.utils :as utils]
            [dirac.main.terminal :as terminal]
            [dirac.nrepl.config-helpers :refer [standard-repl-init-code]]))

; Our goal here is to run nREPL server with Dirac Agent and Figwheel Main inside current JVM.
; With this setup Dirac (v1.4.0+) can be aware of Figwheel Main and use its CLJS compiler auto-magically
; For conceptual overview please see https://github.com/binaryage/dirac/blob/master/docs/about-repls.md#dirac--figwheel

(def nrepl-port (Integer/parseInt (or (System/getenv "DIRAC_MAIN_NREPL_SERVER_PORT") "36180")))
(def agent-port (Integer/parseInt (or (System/getenv "DIRAC_MAIN_AGENT_PORT") "36181")))
(def http-server-port (Integer/parseInt (or (System/getenv "DIRAC_MAIN_HTTP_PORT") "9112")))

; see https://nrepl.org/nrepl/0.6.0/usage/server.html
(defn start-nrepl-server! []
  (let [nrepl-version-string (str "v" (:version-string nrepl.version/version))]
    (log/info "Starting nREPL server" nrepl-version-string "on port" nrepl-port)
    (nrepl.server/start-server
      :port nrepl-port
      :handler (nrepl.server/default-handler #'dirac.nrepl/middleware))))

(defn generate-repl-init-code [src-dir]
  (str standard-repl-init-code "\n\n"
       (slurp (io/file src-dir "dirac" "playground.cljs"))))

(defn prepare-build-options [src-dir out-dir]
  {:main            'dirac.user
   :optimizations   :none
   :output-to       (.getCanonicalPath (io/file out-dir "playground.js"))
   :output-dir      out-dir
   :preloads        ['dirac.runtime.preload 'devtools.preload]
   :external-config {:dirac.runtime/config {:nrepl-config {:repl-init-code (generate-repl-init-code src-dir)}
                                            :agent-host   "localhost"
                                            :agent-port   agent-port}}})

(defn not-found-handler [_req]
  (not-found "NOT FOUND"))

(defn wrap-no-cache [handler]
  (fn [req]
    (some-> (handler req)
            (update :headers assoc
                    "Cache-Control" "no-cache"))))

(defn remove-header [response name]
  (update response :headers dissoc name))

(defn wrap-remove-last-modified [handler]
  (fn [req]
    (some-> (handler req)
            (remove-header "Last-Modified"))))

(defn compile-project! [src-dir out-dir]
  (helpers/delete-files-recursively! out-dir)
  (helpers/ensure-dir! out-dir)
  (let [inputs (cljs/inputs src-dir)
        options (prepare-build-options src-dir out-dir)]
    (log/info "Compiling playground project...")
    (log/debug (str "Build options:\n" (utils/pp options)))
    (cljs/build inputs options)))

(defn start-http-server! [target-dir]
  (let [public-dir (.getCanonicalPath (io/file target-dir))
        ; https://danielcompton.net/2018/03/21/how-to-serve-clojurescript
        middleware-stack (-> not-found-handler
                             (wrap-defaults (merge api-defaults
                                                   {:responses {:not-modified-responses false}}
                                                   {:static {:files [public-dir]}}))
                             (wrap-remove-last-modified)
                             (wrap-no-cache))]
    (log/info (str "Starting playground HTTP server on port " (terminal/style-port http-server-port)))
    (http/run-server middleware-stack {:port http-server-port})))

; see https://github.com/binaryage/dirac/blob/master/docs/installation.md
(defn start-dirac-agent-in-background! [config]
  (log/info "Booting Dirac Agent...")
  (dirac.agent/boot!
    {:log-level    (:log-level config)
     :nrepl-server {:host "localhost"
                    :port nrepl-port}
     :nrepl-tunnel {:host "localhost"
                    :port agent-port}}))

(defn prepare-playground-dir! [dir-path]
  (helpers/ensure-dir! dir-path)
  (helpers/copy-resources-into-dir! "dirac/playground-template" dir-path))

(defn start-playground! [dir-path opts]
  (helpers/delete-files-recursively! dir-path)
  (prepare-playground-dir! dir-path)
  (let [out-dir (.getCanonicalPath (io/file dir-path ".compiled"))
        src-dir (.getCanonicalPath (io/file dir-path "src"))]
    (compile-project! src-dir out-dir)
    (start-http-server! out-dir)
    (start-dirac-agent-in-background! opts)
    (future (start-nrepl-server!))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (locations/get-playground-dir-path)
  (prepare-playground-dir! (locations/get-playground-dir-path)))
