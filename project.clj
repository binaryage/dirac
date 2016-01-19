(defproject binaryage/dirac "0.1.0"
  :description "Dirac DevTools - a Chrome DevTools fork for ClojureScript developers."
  :url "https://github.com/binaryage/dirac"
  :license {:name         "MIT License"
            :url          "http://opensource.org/licenses/MIT"
            :distribution :repo}
  :scm {:name "git"
        :url  "https://github.com/binaryage/dirac"}

  :dependencies [[org.clojure/clojure "1.7.0"]
                 [org.clojure/clojurescript "1.7.170"]
                 [org.clojure/core.async "0.2.374"]
                 [org.clojure/tools.logging "0.3.1"]
                 [org.clojure/tools.cli "0.3.3"]
                 [org.clojure/tools.nrepl "0.2.12"]
                 [clj-logging-config "1.9.12"]
                 [environ "1.0.1"]
                 [http-kit "2.1.21-alpha2"]]

  :plugins [[lein-shell "0.4.2"]
            [lein-environ "1.0.1"]]

;  :jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005"]

  :main dirac.agent-cli
  :aot [dirac.agent-cli]

  :figwheel
  {:server-port    7100
   :server-logfile ".figwheel_server.log"
   :css-dirs       []}

  :source-paths ["src/lib"
                 "src/agent"
                 "src/nrepl"]

  :resource-paths []

  :test-paths ["test/support"
               "test/backend"]

  :clean-targets ^{:protect false} ["target"
                                    "resources/unpacked/compiled"
                                    "resources/release/compiled"
                                    "resources/unpacked/devtools/front_end/dirac/compiled"]

  :checkout-deps-shares ^:replace []

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :profiles {:cljs
             {:dependencies [[binaryage/chromex "0.2.0"]
                             [binaryage/devtools "0.4.1"]
                             [cljs-http "0.1.39"]
                             [figwheel "0.5.0-3"]
                             [reforms "0.4.3"]
                             [rum "0.6.0" :scope "provided"]
                             [rum-reforms "0.4.3"]
                             [parinfer "0.2.3"]
                             [com.lucasbradstreet/cljs-uuid-utils "1.0.2"]]
              :plugins      [[lein-cljsbuild "1.1.0"]
                             [lein-figwheel "0.5.0-3"]]}

             :test
             {:dependencies [[http.async.client "1.1.0"]
                             [org.slf4j/slf4j-log4j12 "1.7.13"]]}

             :unpacked
             {:cljsbuild {:builds
                          {:implant
                           {:source-paths ["src/implant"]
                            :compiler     {:output-to            "resources/unpacked/devtools/front_end/dirac/compiled/implant/implant.js"
                                           :output-dir           "resources/unpacked/devtools/front_end/dirac/compiled/implant"
                                           :asset-path           "dirac/_compiled/implant"
                                           :optimizations        :none
                                           :compiler-stats       true
                                           :source-map           true
                                           :source-map-timestamp true}}

                           :background
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/background"]
                            :compiler     {:output-to            "resources/unpacked/compiled/background/dirac.js"
                                           :output-dir           "resources/unpacked/compiled/background"
                                           :asset-path           "compiled/background"
                                           :optimizations        :none
                                           :compiler-stats       true
                                           :source-map           true
                                           :source-map-timestamp true}}
                           :options
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/options"]
                            :compiler     {:output-to            "resources/unpacked/compiled/options/dirac.js"
                                           :output-dir           "resources/unpacked/compiled/options"
                                           :asset-path           "compiled/options"
                                           :optimizations        :none
                                           :compiler-stats       true
                                           :source-map           true
                                           :source-map-timestamp true}}}}}
             :checkouts
             {:cljsbuild {:builds
                          {:background {:source-paths ["checkouts/cljs-devtools/src"
                                                       "checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}
                           :options    {:source-paths ["checkouts/cljs-devtools/src"
                                                       "checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}}}}
             :packed
             {:env       {:chromex-elide-verbose-logging true}
              :cljsbuild {:builds
                          {:implant
                           {:source-paths ["src/implant"]
                            :compiler     {:output-to      "resources/unpacked/devtools/front_end/dirac/compiled/implant.js"
                                           :output-dir     "resources/unpacked/devtools/front_end/dirac/compiled"
                                           :asset-path     "dirac/_compiled/implant"
                                           :optimizations  :advanced
                                           :elide-asserts  true
                                           :compiler-stats true}}
                           :background
                           {:source-paths ["src/rel"
                                           "src/shared"
                                           "src/background"]
                            :compiler     {:output-to      "resources/release/compiled/background.js"
                                           :output-dir     "resources/release/compiled/background"
                                           :asset-path     "compiled/background"
                                           :optimizations  :advanced
                                           :elide-asserts  true
                                           :compiler-stats true}}
                           :options
                           {:source-paths ["src/rel"
                                           "src/shared"
                                           "src/options"]
                            :compiler     {:output-to      "resources/release/compiled/options.js"
                                           :output-dir     "resources/release/compiled/options"
                                           :asset-path     "compiled/options"
                                           :optimizations  :advanced
                                           :elide-asserts  true
                                           :compiler-stats true}}}}}

             :pseudo-names
             {:cljsbuild {:builds
                          {:implant
                           {:compiler {:pseudo-names true}}
                           :background
                           {:compiler {:pseudo-names true}}
                           :options
                           {:compiler {:pseudo-names true}}}}}

             :nuke-aliases
             {:aliases ^:replace {}}}

  :aliases {"test"                 ["test" "dirac.tests"]
            "jar"                  ["shell" "scripts/lein-without-checkouts.sh" "jar"]
            "install"              ["shell" "scripts/lein-without-checkouts.sh" "install"]
            "uberjar"              ["shell" "scripts/lein-without-checkouts.sh" "uberjar"]
            "dev-build"            ["with-profile" "+unpacked,+cljs,+checkouts"
                                    "cljsbuild" "once" "background" "options" "implant"]
            "fig"                  ["with-profile" "+unpacked,+cljs,+checkouts"
                                    "do" "clean,"
                                    "figwheel" "background" "options" "implant"]
            "release"              ["with-profile" "+packed,+cljs"
                                    "do" "clean,"
                                    "cljsbuild" "once" "implant" "background" "options"]
            "release-pseudo-names" ["with-profile" "+packed,+cljs,+pseudo-names"
                                    "do" "clean,"
                                    "cljsbuild" "once" "implant" "background" "options"]
            "package"              ["shell" "scripts/package.sh"]
            "regenerate"           ["shell" "scripts/regenerate.sh"]})
