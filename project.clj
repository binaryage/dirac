(defproject binaryage/dirac "0.1.0-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [org.clojure/clojurescript "1.7.170"]
                 [org.clojure/core.async "0.2.374"]
                 [binaryage/chromex "0.2.0"]
                 [binaryage/devtools "0.4.1"]
                 [cljs-http "0.1.38"]
                 [figwheel "0.5.0-1"]
                 [reforms "0.4.3"]
                 [rum "0.6.0" :scope "provided"]
                 [rum-reforms "0.4.3"]
                 [parinfer "0.2.3"]
                 [environ "1.0.1"]]

  :plugins [[lein-cljsbuild "1.1.1"]
            [lein-figwheel "0.5.0-2"]
            [lein-shell "0.4.2"]
            [lein-environ "1.0.1"]]

  :figwheel
  {:server-port    7100
   :server-logfile ".figwheel_server.log"
   :css-dirs       []}

  :source-paths ["src"
                 "scripts"]

  :clean-targets ^{:protect false} ["target"
                                    "resources/unpacked/compiled"
                                    "resources/release/compiled"
                                    "resources/unpacked/devtools/front_end/_cljs"]

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :profiles {:unpacked
             {:cljsbuild {:builds
                          {:implant
                           {:source-paths ["src/implant"]
                            :compiler     {:output-to             "resources/unpacked/devtools/front_end/_cljs/implant.js"
                                           :output-dir            "resources/unpacked/devtools/front_end/_cljs"
                                           :asset-path            "_cljs"
                                           :optimizations         :none
                                           :compiler-stats        true
                                           :source-map            true
                                           :source-map-timestamp  true}}
                           :background
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/background"]
                            :compiler     {:output-to             "resources/unpacked/compiled/background/dirac.js"
                                           :output-dir            "resources/unpacked/compiled/background"
                                           :asset-path            "compiled/background"
                                           :optimizations         :none
                                           :compiler-stats        true
                                           :source-map            true
                                           :source-map-timestamp  true}}
                           :options
                           {:source-paths ["src/dev"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/options"]
                            :compiler     {:output-to             "resources/unpacked/compiled/options/dirac.js"
                                           :output-dir            "resources/unpacked/compiled/options"
                                           :asset-path            "compiled/options"
                                           :optimizations         :none
                                           :compiler-stats        true
                                           :source-map            true
                                           :source-map-timestamp  true}}}}}
             :checkouts
             {:cljsbuild {:builds
                          {:background {:source-paths ["checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}
                           :options    {:source-paths ["checkouts/chromex/src/lib"
                                                       "checkouts/chromex/src/exts"]}}}}
             :release
             {:env       {:chromex-elide-verbose-logging true}
              :cljsbuild {:builds
                          {:implant
                           {:source-paths ["src/implant"]
                            :compiler     {:output-to      "resources/unpacked/devtools/front_end/_cljs/implant.js"
                                           :output-dir     "resources/unpacked/devtools/front_end/_cljs"
                                           :asset-path     "_cljs"
                                           :optimizations  :advanced
                                           ;:anon-fn-naming-policy :unmapped
                                           ;:pseudo-names   true
                                           :elide-asserts  true
                                           :compiler-stats true}}
                           :background
                           {:source-paths ["src/shared"
                                           "src/background"]
                            :compiler     {:output-to      "resources/release/compiled/background.js"
                                           :output-dir     "resources/release/compiled/background"
                                           :asset-path     "compiled/background"
                                           :optimizations  :advanced
                                           ;:anon-fn-naming-policy :unmapped
                                           ;:pseudo-names   true
                                           :elide-asserts  true
                                           :compiler-stats true}}
                           :options
                           {:source-paths ["src/shared"
                                           "src/options"]
                            :compiler     {:output-to      "resources/release/compiled/options.js"
                                           :output-dir     "resources/release/compiled/options"
                                           :asset-path     "compiled/options"
                                           :optimizations  :advanced
                                           ;:anon-fn-naming-policy :unmapped
                                           ;:pseudo-names   true
                                           :elide-asserts  true
                                           :compiler-stats true}}}}}}

  :aliases {"dev-build"  ["with-profile" "+unpacked" "cljsbuild" "once" "background" "options" "implant"]
            "fig"        ["with-profile" "+unpacked" "do" "clean," "figwheel" "background" "options" "implant"]
            "content"    ["with-profile" "+unpacked" "cljsbuild" "auto"]
            "release"    ["with-profile" "+release" "do" "clean," "cljsbuild" "once" "implant" "background" "options"]
            "package"    ["shell" "scripts/package.sh"]
            "regenerate" ["shell" "scripts/regenerate.sh"]})
