(ns dirac-gpig.repl
  (:require [figwheel.main.api :as figwheel]
            [nrepl.version]
            [nrepl.server]
            [dirac.agent]
            [dirac.nrepl]
            [dirac.logging :as logging]))

; Our goal here is to run nREPL server with Dirac Agent and Figwheel Main inside a single JVM.
; With this setup Dirac (v1.4.0+) can be aware of Figwheel Main and use its CLJS compiler auto-magically
; For conceptual overview please see https://github.com/binaryage/dirac/blob/master/docs/about-repls.md#dirac--figwheel

(defn setup-logging! []
  (logging/setup! {:log-out   :console
                   :log-level "DEBUG"}))

(def nrepl-port (Integer/parseInt (or (System/getenv "DIRAC_NREPL_SERVER_PORT") "8230")))

; see https://nrepl.org/nrepl/0.6.0/usage/server.html
(defn start-nrepl-server! []
  (let [nrepl-version-string (str "v" (:version-string nrepl.version/version))]
    (println "Starting nREPL server" nrepl-version-string "on port" nrepl-port)
    (nrepl.server/start-server
      :port nrepl-port
      :handler (nrepl.server/default-handler #'dirac.nrepl/middleware))))

; see https://figwheel.org/docs/scripting_api.html#starting-figwheel-from-the-repl-or-script
(defn start-figwheel-in-background! []
  (figwheel/start {:mode     :serve
                   :open-url false}
                  "dev"))

; see https://github.com/binaryage/dirac/blob/master/docs/installation.md
(defn start-dirac-agent-in-background! []
  (dirac.agent/boot!))

(defn -main [& _args]
  (setup-logging!)
  (start-figwheel-in-background!)                                                                                             ; non-blocking
  (start-dirac-agent-in-background!)                                                                                          ; non-blocking
  (start-nrepl-server!))                                                                                                      ; blocking
