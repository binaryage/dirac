(def devtools-version "0.9.10")
(def dirac-version "1.3.11")
(def figwheel-version "0.5.19")
(defproject binaryage/dirac-sample "0.1.0-SNAPSHOT"
  :description "An example integration of Dirac DevTools"
  :url "https://github.com/binaryage/dirac-sample"

  :dependencies [[org.clojure/clojure "1.10.1"]
                 [org.clojure/clojurescript "1.10.520"]
                 [nrepl/nrepl "0.6.0"]
                 [clojure-complete "0.2.5" :exclusions [org.clojure/clojure]]
                 [binaryage/devtools ~devtools-version]
                 [binaryage/dirac ~dirac-version]
                 [figwheel ~figwheel-version]]

  :plugins [[lein-cljsbuild "1.1.7"]
            [lein-shell "0.5.0"]
            [lein-cooper "1.2.2"]
            [lein-figwheel ~figwheel-version]]

  ; =========================================================================================================================

  :source-paths ["src/shared"
                 "scripts"                                                                                                    ; just for IntelliJ
                 "src/demo"
                 "src/demo-node"
                 "src/tests"]

  :clean-targets ^{:protect false} ["target"
                                    "resources/public/.compiled"
                                    "resources/demo-node/.compiled"]

  ; this effectively disables checkouts and gives us a chance to re-enable them on per-profile basis, see :checkouts profile
  ; http://jakemccrary.com/blog/2015/03/24/advanced-leiningen-checkouts-configuring-what-ends-up-on-your-classpath/
  :checkout-deps-shares ^:replace []

  ; =========================================================================================================================

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :profiles {; --------------------------------------------------------------------------------------------------------------
             :clojure17
             {:dependencies ^:replace [[org.clojure/clojure "1.7.0" :upgrade false]
                                       [org.clojure/clojurescript "1.7.228" :upgrade false]
                                       [binaryage/devtools ~devtools-version]
                                       [binaryage/dirac ~dirac-version]]}

             :clojure18
             {:dependencies ^:replace [[org.clojure/clojure "1.8.0" :upgrade false]
                                       [org.clojure/clojurescript "1.9.908" :upgrade false]
                                       [binaryage/devtools ~devtools-version]
                                       [binaryage/dirac ~dirac-version]]}

             :clojure19
             {:dependencies ^:replace [[org.clojure/clojure "1.9.0" :upgrade false]
                                       [org.clojure/clojurescript "1.10.339" :upgrade false]
                                       [binaryage/devtools ~devtools-version]
                                       [binaryage/dirac ~dirac-version]]}

             :clojure110
             {:dependencies []}

             :clojure-current
             [:clojure110]

             ; --------------------------------------------------------------------------------------------------------------
             :demo
             {:cljsbuild {:builds {:demo
                                   {:source-paths ["src/shared"
                                                   "src/demo"]
                                    :compiler     {:output-to       "resources/public/.compiled/demo/demo.js"
                                                   :output-dir      "resources/public/.compiled/demo"
                                                   :asset-path      ".compiled/demo"
                                                   :preloads        [devtools.preload dirac.runtime.preload]
                                                   :main            dirac-sample.demo
                                                   :external-config {:dirac.runtime/config {:nrepl-config {:reveal-url-script-path "scripts/reveal.sh"
                                                                                                           ;:reveal-url-request-handler (fn [config url line column]
                                                                                                           ;                              (str "ERR REPLY>" url))
                                                                                                           }}}
                                                   :optimizations   :none
                                                   :source-map      true}}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :demo-advanced
             {:cljsbuild {:builds {:demo-advanced
                                   {:source-paths ["src/shared"
                                                   "src/demo"]
                                    :compiler     {:output-to     "resources/public/.compiled/demo_advanced/dirac_sample.js"
                                                   :output-dir    "resources/public/.compiled/demo_advanced"
                                                   :asset-path    ".compiled/demo_advanced"
                                                   :pseudo-names  true
                                                   :preloads      [dirac.runtime.preload]
                                                   :main          dirac-sample.demo
                                                   :optimizations :advanced}}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :demo-node
             {:cljsbuild {:builds {:demo
                                   {:source-paths ["src/shared"
                                                   "src/demo-node"]
                                    :compiler     {:output-to             "resources/demo-node/.compiled/demo.js"
                                                   :output-dir            "resources/demo-node/.compiled"
                                                   :asset-path            ".compiled"
                                                   :source-map-asset-path "http://localhost:9988/.compiled"                   ; see run-demo-node-source-maps-server.sh, CLJS-1075
                                                   :preloads              [devtools.preload dirac.runtime.preload]
                                                   :main                  dirac-sample.demo
                                                   :target                :nodejs
                                                   :optimizations         :none}}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :demo-node-inline-sm
             {:cljsbuild {:builds {:demo {:compiler {:inline-source-maps true}}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :tests
             {:cljsbuild {:builds {:tests
                                   {:source-paths ["src/shared"
                                                   "src/tests"]
                                    :compiler     {:output-to     "resources/public/.compiled/tests/tests.js"
                                                   :output-dir    "resources/public/.compiled/tests"
                                                   :asset-path    ".compiled/tests"
                                                   :preloads      [devtools.preload dirac.runtime.preload]
                                                   :main          dirac-sample.main
                                                   :optimizations :none
                                                   :source-map    true}}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :cider
             {:dependencies [[cider/cider-nrepl "0.15.1"]]
              :repl-options {:nrepl-middleware [cider.nrepl.middleware.apropos/wrap-apropos
                                                cider.nrepl.middleware.classpath/wrap-classpath
                                                cider.nrepl.middleware.complete/wrap-complete
                                                cider.nrepl.middleware.debug/wrap-debug
                                                cider.nrepl.middleware.format/wrap-format
                                                cider.nrepl.middleware.info/wrap-info
                                                cider.nrepl.middleware.inspect/wrap-inspect
                                                cider.nrepl.middleware.macroexpand/wrap-macroexpand
                                                cider.nrepl.middleware.ns/wrap-ns
                                                cider.nrepl.middleware.pprint/wrap-pprint
                                                cider.nrepl.middleware.pprint/wrap-pprint-fn
                                                cider.nrepl.middleware.refresh/wrap-refresh
                                                cider.nrepl.middleware.resource/wrap-resource
                                                cider.nrepl.middleware.stacktrace/wrap-stacktrace
                                                cider.nrepl.middleware.test/wrap-test
                                                cider.nrepl.middleware.trace/wrap-trace
                                                cider.nrepl.middleware.out/wrap-out
                                                cider.nrepl.middleware.undef/wrap-undef
                                                cider.nrepl.middleware.version/wrap-version]}
              }

             :dirac-logging
             {:dependencies [[clj-logging-config "1.9.12"]]
              :repl-options {:init ^:replace (do
                                               (require 'dirac.agent)
                                               (require 'dirac.logging)
                                               (dirac.logging/setup! {:log-out   :console
                                                                      :log-level "TRACE"})
                                               (dirac.agent/boot!))}}

             ; --------------------------------------------------------------------------------------------------------------
             :repl
             {:repl-options {:port             8230
                             :nrepl-middleware [dirac.nrepl/middleware]
                             :init             (do
                                                 (require 'dirac.agent)
                                                 (dirac.agent/boot!))}}

             ; --------------------------------------------------------------------------------------------------------------
             :figwheel-config
             {:figwheel  {:server-port    7111
                          :server-logfile ".figwheel/demo.log"
                          :repl           false}
              :cljsbuild {:builds
                          {:demo
                           {:figwheel true}}}}

             :figwheel-repl
             {:figwheel {:repl true}}

             :figwheel-nrepl
             [:figwheel-config
              ; following https://github.com/bhauman/lein-figwheel/wiki/Using-the-Figwheel-REPL-within-NRepl
              {:dependencies [[figwheel-sidecar ~figwheel-version]]
               :repl-options {:init ^:replace (do
                                                (require 'dirac.agent)
                                                (use 'figwheel-sidecar.repl-api)
                                                (start-figwheel!
                                                  {:figwheel-options {:server-port 7111}                                      ;; <-- figwheel server config goes here
                                                   :build-ids        ["demo"]                                                 ;; <-- a vector of build ids to start autobuilding
                                                   :all-builds                                                                ;; <-- supply your build configs here
                                                                     [{:id           "demo"
                                                                       :figwheel     true
                                                                       :source-paths ["src/shared"
                                                                                      "src/demo"]
                                                                       :compiler     {:output-to     "resources/public/.compiled/demo/demo.js"
                                                                                      :output-dir    "resources/public/.compiled/demo"
                                                                                      :asset-path    ".compiled/demo"
                                                                                      :preloads      ['devtools.preload 'dirac.runtime.preload]
                                                                                      :main          'dirac-sample.demo
                                                                                      :optimizations :none
                                                                                      :source-map    true}}]})
                                                (dirac.agent/boot!)
                                                #_(cljs-repl))

                              }
               }]

             ; --------------------------------------------------------------------------------------------------------------
             :checkouts
             {:checkout-deps-shares ^:replace [:source-paths
                                               :test-paths
                                               :resource-paths
                                               :compile-path
                                               #=(eval leiningen.core.classpath/checkout-deps-paths)]
              :cljsbuild            {:builds
                                     {:demo
                                      {:source-paths ["checkouts/cljs-devtools/src/lib"
                                                      "checkouts/dirac/src/runtime"]}
                                      :tests
                                      {:source-paths ["checkouts/cljs-devtools/src/lib"
                                                      "checkouts/dirac/src/runtime"]}}}}

             ; --------------------------------------------------------------------------------------------------------------
             :debugger-5005
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"]}

             :suspended-debugger-5005
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005"]}

             :debugger-5006
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5006"]}

             :suspended-debugger-5006
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5006"]}

             :debugger-5007
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5007"]}

             :suspended-debugger-5007
             {:jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5007"]}

             ; --------------------------------------------------------------------------------------------------------------
             :cooper-config
             {:cooper {"figwheel" ["lein" "dev-fig"]
                       "server"   ["lein" "dev-server"]}}}

  ; =========================================================================================================================

  :aliases {"demo"                     "demo110"

            "demo110"                  ["with-profile" "+demo,+clojure110" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/dev-server.sh"]]
            "demo19"                   ["with-profile" "+demo,+clojure19" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/dev-server.sh"]]
            "demo18"                   ["with-profile" "+demo,+clojure18" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/dev-server.sh"]]
            "demo17"                   ["with-profile" "+demo,+clojure17" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/dev-server.sh"]]
            "demo-advanced"            ["with-profile" "+demo-advanced" "do"
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/dev-server.sh"]]

            "demo-node"                "demo-node110"
            "demo-node110"             ["with-profile" "+demo-node,+clojure110" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/run-node-demo.sh"]]
            "demo-node19"              ["with-profile" "+demo-node,+clojure19" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/run-node-demo.sh"]]
            "demo-node18"              ["with-profile" "+demo-node,+clojure18" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/run-node-demo.sh"]]
            "demo-node17"              ["with-profile" "+demo-node,+clojure17" "do"
                                        ["clean"]
                                        ["cljsbuild" "once"]
                                        ["shell" "scripts/run-node-demo.sh"]]
            "demo-node-dev"            ["with-profile" "+demo-node,+clojure-current,+checkouts" "do"
                                        ["cljsbuild" "once" "demo"]
                                        ["shell" "scripts/run-node-demo.sh"]]
            "demo-node-dev-inlined-sm" ["with-profile" "+demo-node,+demo-node-inline-sm,+clojure-current,+checkouts" "do"
                                        ["cljsbuild" "once" "demo"]
                                        ["shell" "scripts/run-node-demo.sh" "1"]]

            "repl17"                   ["with-profile" "+repl,+clojure17" "repl"]
            "repl18"                   ["with-profile" "+repl,+clojure18" "repl"]
            "repl19"                   ["with-profile" "+repl,+clojure19" "repl"]
            "repl110"                  ["with-profile" "+repl,+clojure110" "repl"]
            "repl-dev"                 ["with-profile" "+repl,+clojure-current,+checkouts,+dirac-logging,+debugger-5005" "repl"]
            "repl-cider"               ["with-profile" "+repl,+clojure-current,+cider" "repl"]
            "repl-figwheel"            ["with-profile" "+repl,+clojure-current,+checkouts,+figwheel-nrepl" "repl"]

            "fig-repl"                 ["with-profile" "+repl,+clojure-current,+figwheel-config,+figwheel-repl" "figwheel"]
            "auto-compile-tests"       ["with-profile" "+tests,+checkouts" "cljsbuild" "auto"]
            "auto-compile-demo"        ["with-profile" "+demo,+checkouts" "cljsbuild" "auto"]
            "dev-fig"                  ["with-profile" "+demo,+tests,+checkouts,+figwheel-config" "figwheel" "demo" "tests"]
            "dev-server"               ["shell" "scripts/dev-server.sh"]
            "dev"                      ["with-profile" "+cooper-config" "do"
                                        ["clean"]
                                        ["cooper"]]})
