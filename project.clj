(defproject binaryage/dirac "0.1.4"
  :description "Dirac DevTools - a Chrome DevTools fork for ClojureScript developers."
  :url "https://github.com/binaryage/dirac"
  :license {:name         "MIT License"
            :url          "http://opensource.org/licenses/MIT"
            :distribution :repo}
  :scm {:name "git"
        :url  "https://github.com/binaryage/dirac"}

  :dependencies [[org.clojure/clojure "1.8.0" :scope "provided"]
                 [org.clojure/clojurescript "1.7.228" :scope "provided"]
                 [org.clojure/core.async "0.2.374"]
                 [org.clojure/tools.logging "0.3.1"]
                 [org.clojure/tools.cli "0.3.3"]
                 [org.clojure/tools.nrepl "0.2.12"]
                 [http-kit "2.1.21-alpha2"]
                 [clj-logging-config "1.9.12"]
                 [version-clj "0.1.2"]
                 [environ "1.0.1"]

                 ; we cannot use :dependencies under individual profiles because Cursive recognizes only root level
                 ; thus we mark extra deps with :scope "test" and filter them later when producing jar library
                 [binaryage/chromex "0.2.0" :scope "test"]
                 [binaryage/devtools "0.5.2" :scope "test"]
                 [cljs-http "0.1.39" :scope "test"]
                 [figwheel "0.5.0-4" :scope "test"]
                 [reforms "0.4.3" :scope "test"]
                 [rum "0.6.0" :scope "test"]
                 [rum-reforms "0.4.3" :scope "test"]
                 [parinfer "0.2.3" :scope "test"]
                 [com.lucasbradstreet/cljs-uuid-utils "1.0.2" :scope "test"]

                 [http.async.client "1.1.0" :scope "test"]
                 [org.slf4j/slf4j-log4j12 "1.7.13" :scope "test"]

                 [clj-webdriver "0.7.2" :scope "test"]
                 [org.seleniumhq.selenium/selenium-java "2.50.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-chrome-driver "2.50.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-support "2.50.0" :scope "test"]

                 [ring/ring-core "1.4.0" :scope "test"]
                 [ring/ring-devel "1.4.0" :scope "test"]
                 [ring/ring-jetty-adapter "1.4.0" :scope "test"]]

  :plugins [[lein-shell "0.4.2"]
            [lein-environ "1.0.1"]]

  ;  :jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005"]

  :figwheel
  {:server-port    7100
   :server-logfile ".figwheel_server.log"
   :css-dirs       []}

  :source-paths ["src"]                                                                                                       ; this is for Cursive, will be redefined by profiles
  :resource-paths ["resources"]                                                                                               ; this is for Cursive, will be redefined by profiles
  :test-paths ["test"]                                                                                                        ; this is for Cursive, will be redefined by profiles

  :clean-targets []

  :checkout-deps-shares ^:replace []

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :profiles {:lib
             ^{:pom-scope :provided}                                                                                          ; ! to overcome default jar/pom behaviour, our :dependencies replacement would be ignored for some reason
             [:nuke-aliases
              {:clean-targets  ["target"]
               :dependencies   ~(let [project (->> "project.clj"
                                                slurp read-string (drop 3) (apply hash-map))
                                      test-dep? #(->> % (drop 2) (apply hash-map) :scope (= "test"))
                                      non-test-deps (remove test-dep? (:dependencies project))]
                                  (with-meta (vec non-test-deps) {:replace true}))
               :source-paths   ^:replace ["src/lib"
                                          "src/agent"
                                          "src/nrepl"
                                          "src/project"]
               :resource-paths ^:replace []
               :test-paths     ^:replace []}]

             :cljs
             {:plugins [[lein-cljsbuild "1.1.2"]
                        [lein-figwheel "0.5.0-4"]]
              :hooks   [leiningen.cljsbuild]}

             :backend-tests
             {:test-paths ["test/support"
                           "test/backend"]}

             :browser-tests
             {:test-paths ["test/support"
                           "test/browser"]
              :resource-paths ["test"]}

             :browser-fixtures
             {:clean-targets ^{:replace true :protect false} ["test/browser-fixtures/p01/resources/compiled"]
              :cljsbuild     {:builds
                              {:p01
                               {:source-paths ["test/browser-fixtures/p01/src"]
                                :compiler     {:output-to     "test/browser-fixtures/p01/resources/compiled/core.js"
                                               :output-dir    "test/browser-fixtures/p01/resources/compiled"
                                               :asset-path    "compiled/p01"
                                               :optimizations :none
                                               :source-map    true}}}}}

             :unpacked
             {:clean-targets ^{:replace true :protect false} ["resources/unpacked/compiled"
                                                              "resources/unpacked/devtools/front_end/dirac/compiled"]
              :cljsbuild     {:builds
                              {:implant
                               {:source-paths ["src/implant"]
                                :compiler     {:output-to            "resources/unpacked/devtools/front_end/dirac/compiled/implant/implant.js"
                                               :output-dir           "resources/unpacked/devtools/front_end/dirac/compiled/implant"
                                               :asset-path           "dirac/compiled/implant"
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
             {:clean-targets ^{:replace true :protect false} ["resources/release/compiled"]
              :env           {:chromex-elide-verbose-logging true}
              :cljsbuild     {:builds
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

  :aliases {"test"                         ["test-backend"]
            "test-backend"                 ["with-profile" "+backend-tests"
                                            "run" "-m" "dirac.backend-tests-runner"]
            "test-browser"                 ["with-profile" "+browser-tests,+browser-fixtures,+cljs"
                                            "do" "clean,"
                                            "cljsbuild" "once" "p01,"
                                            "run" "-m" "dirac.browser-tests-runner"]
            "jar"                          ["shell" "scripts/lein-lib-without-checkouts.sh" "jar"]
            "install"                      ["shell" "scripts/lein-lib-without-checkouts.sh" "install"]
            "uberjar"                      ["shell" "scripts/lein-lib-without-checkouts.sh" "uberjar"]
            "dev-build"                    ["with-profile" "+unpacked,+cljs,+checkouts"
                                            "cljsbuild" "once" "background" "options" "implant"]
            "fig"                          ["with-profile" "+unpacked,+cljs,+checkouts"
                                            "do" "clean,"
                                            "figwheel" "background" "options" "implant"]
            "compile-release"              ["with-profile" "+packed,+cljs"
                                            "do" "clean,"
                                            "cljsbuild" "once" "background" "options" "implant"]
            "compile-release-pseudo-names" ["with-profile" "+packed,+cljs,+pseudo-names"
                                            "do" "clean,"
                                            "cljsbuild" "once" "implant" "background" "options"]
            "release"                      ["shell" "scripts/release.sh"]
            "package"                      ["shell" "scripts/package.sh"]
            "regenerate"                   ["shell" "scripts/regenerate.sh"]})
