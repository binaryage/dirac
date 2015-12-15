(defproject binaryage/dirac "0.1.0-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [org.clojure/clojurescript "1.7.170"]
                 [org.clojure/core.async "0.2.374"]
                 [binaryage/chromex "0.2.0"]
                 [binaryage/devtools "0.4.1"]
                 [figwheel "0.5.0-1"]
                 [environ "1.0.1"]]

  :plugins [[lein-cljsbuild "1.1.1"]
            [lein-figwheel "0.5.0-2"]
            [lein-shell "0.4.2"]
            [lein-environ "1.0.1"]
            [lein-cooper "1.1.2"]]

  :figwheel
  {:server-port    7000
   :nrepl-port     7777
   :server-logfile ".figwheel_server.log"
   :css-dirs       []}

  :source-paths []

  :clean-targets ^{:protect false} ["target"
                                    "resources/unpacked/compiled"
                                    "resources/release/compiled"
                                    "resources/unpacked/devtools/front_end/_cljs"]

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :profiles {:unpacked
             {:cljsbuild {:builds
                          {:implant
                           {:source-paths ["src/implant"]
                            :compiler     {:main                  dirac.implant.main
                                           :output-to             "resources/unpacked/devtools/front_end/_cljs/shell.js"
                                           :output-dir            "resources/unpacked/devtools/front_end/_cljs"
                                           :asset-path            "resources/unpacked/_cljs"
                                           :optimizations         :none
                                           :anon-fn-naming-policy :unmapped
                                           :compiler-stats        true
                                           :source-map            true
                                           :source-map-timestamp  true}}
                           :background
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/background"]
                            :compiler     {:output-to             "resources/unpacked/compiled/background/dirac.js"
                                           :output-dir            "resources/unpacked/compiled/background"
                                           :asset-path            "compiled/background"
                                           :optimizations         :none
                                           :anon-fn-naming-policy :unmapped
                                           :compiler-stats        true
                                           :cache-analysis        true
                                           :source-map            true
                                           :source-map-timestamp  true}}
                           :popup
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/popup"]
                            :compiler     {:output-to             "resources/unpacked/compiled/popup/dirac.js"
                                           :output-dir            "resources/unpacked/compiled/popup"
                                           :asset-path            "compiled/popup"
                                           :optimizations         :none
                                           :anon-fn-naming-policy :unmapped
                                           :compiler-stats        true
                                           :cache-analysis        true
                                           :source-map            true
                                           :source-map-timestamp  true}}}}}
             :checkouts
             {:cljsbuild {:builds
                          {:background {:source-paths ["checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}
                           :popup      {:source-paths ["checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}}}}
             :release
             {:env       {:chromex-elide-verbose-logging true}
              :cljsbuild {:builds
                          {:background
                           {:source-paths ["src/background"]
                            :compiler     {:output-to      "resources/release/compiled/background.js"
                                           :output-dir     "resources/release/compiled/background"
                                           :asset-path     "compiled/background"
                                           :optimizations  :advanced
                                           :elide-asserts  true
                                           :compiler-stats true}}
                           :popup
                           {:source-paths ["src/popup"]
                            :compiler     {:output-to      "resources/release/compiled/popup.js"
                                           :output-dir     "resources/release/compiled/popup"
                                           :asset-path     "compiled/popup"
                                           :optimizations  :advanced
                                           :elide-asserts  true
                                           :compiler-stats true}}}}}}

  :aliases {"dev-build" ["with-profile" "+unpacked" "cljsbuild" "once" "background" "popup" "implant"]
            "fig"       ["with-profile" "+unpacked" "figwheel" "background" "popup" "implant"]
            "content"   ["with-profile" "+unpacked" "cljsbuild" "auto"]
            "devel"     ["do" "clean," "cooper"]
            "release"   ["with-profile" "+release" "do" "clean," "cljsbuild" "once" "background" "popup"]
            "package"   ["shell" "scripts/package.sh"]})
