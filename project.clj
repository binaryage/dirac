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
                 [environ "1.0.2"]

                 ; we cannot use :dependencies under individual profiles because Cursive recognizes only root level
                 ; thus we mark extra deps with :scope "test" and filter them later when producing jar library
                 [binaryage/chromex "0.3.0" :scope "test"]
                 [binaryage/devtools "0.6.0" :scope "test"]
                 [cljs-http "0.1.39" :scope "test"]
                 [figwheel "0.5.1" :scope "test"]
                 [reforms "0.4.3" :scope "test"]
                 [rum "0.6.0" :scope "test"]
                 [rum-reforms "0.4.3" :scope "test"]
                 [funcool/cuerdas "0.7.1" :scope "test"]
                 [parinfer "0.2.3" :scope "test"]
                 [com.lucasbradstreet/cljs-uuid-utils "1.0.2" :scope "test"]

                 [http.async.client "1.1.0" :scope "test"]
                 [org.slf4j/slf4j-log4j12 "1.7.19" :scope "test"]

                 [clj-webdriver "0.7.2" :scope "test"]
                 [org.seleniumhq.selenium/selenium-java "2.53.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-chrome-driver "2.53.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-support "2.53.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-htmlunit-driver "2.52.0" :scope "test"]
                 [org.seleniumhq.selenium/selenium-api "2.53.0" :scope "test"]

                 [ring/ring-core "1.4.0" :scope "test"]
                 [ring/ring-devel "1.4.0" :scope "test"]
                 [ring/ring-jetty-adapter "1.4.0" :scope "test"]
                 [clj-time "0.11.0" :scope "test"]]

  :plugins [[lein-shell "0.4.2"]
            [lein-environ "1.0.1"]]

  ;  :jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005"]

  :source-paths ["src"
                 "test/backend/src"
                 "test/browser/fixtures"
                 "test/browser/src"
                 "test/marion/src"]
  :resource-paths ["resources"]                                                                                               ; this is for Cursive, will be redefined by profiles
  :test-paths ["test"]                                                                                                        ; this is for Cursive, will be redefined by profiles

  ; unfortunately this must be on root level because leiningen does not properly merge metadata
  ;   see https://github.com/technomancy/leiningen/issues/1826
  ;   ! be careful with lein clean or tasks which do cleaning implicitly, this will wipe out all projects generated files
  :clean-targets ^{:protect false} ["target"
                                    "resources/unpacked/compiled"
                                    "resources/unpacked/devtools/front_end/dirac/compiled"
                                    "resources/release/compiled"
                                    "test/browser/fixtures/resources/compiled"
                                    "test/marion/resources/unpacked/compiled"]

  :checkout-deps-shares ^:replace []

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :env {:dirac-root ~(System/getProperty "user.dir")}

  :profiles {:lib
             ^{:pom-scope :provided}                                                                                          ; ! to overcome default jar/pom behaviour, our :dependencies replacement would be ignored for some reason
             [:nuke-aliases
              {:dependencies   ~(let [project (->> "project.clj"
                                                slurp read-string (drop 3) (apply hash-map))
                                      test-dep? #(->> % (drop 2) (apply hash-map) :scope (= "test"))
                                      non-test-deps (remove test-dep? (:dependencies project))]
                                  (with-meta (vec non-test-deps) {:replace true}))                                            ; so ugly!
               :source-paths   ^:replace ["src/project"
                                          "src/settings"
                                          "src/runtime"
                                          "src/lib"
                                          "src/agent"
                                          "src/nrepl"]
               :resource-paths ^:replace []
               :test-paths     ^:replace []}]

             :cooper
             {:plugins [[lein-cooper "1.2.1"]]}

             :cljs
             {:plugins [[lein-cljsbuild "1.1.2"]
                        [lein-figwheel "0.5.1"]]
              :hooks   [leiningen.cljsbuild]}

             :test-runner
             {:source-paths ^:replace ["src/settings"
                                       "src/lib"
                                       "src/agent"
                                       "src/nrepl"
                                       "src/project"]
              :test-paths   ["src/test"
                             "test/browser/src"
                             "test/backend/src"]}

             :browser-tests
             {:cljsbuild {:builds
                          {:tests
                           {:source-paths ["src/settings"
                                           "src/project"
                                           "src/lib"
                                           "src/fixtures"
                                           "src/runtime"
                                           "src/test"
                                           "src/agent"
                                           "src/nrepl"
                                           "test/browser/fixtures/src/tests"]
                            :compiler     {:output-to     "test/browser/fixtures/resources/compiled/tests/tests.js"
                                           :output-dir    "test/browser/fixtures/resources/compiled/tests"
                                           :asset-path    "compiled/tests"
                                           :optimizations :none                                                               ; we rely on optimizations :none in test runner
                                           :source-map    true}}}}}

             :marion
             {:figwheel  {:server-port    7200
                          :server-logfile ".figwheel_marion.log"
                          :repl           false}
              :cljsbuild {:builds
                          {:marion-background
                           {:source-paths ["src/settings"
                                           "src/shared"
                                           "test/marion/src/dev"
                                           "test/marion/src/background"]
                            :compiler     {:output-to     "test/marion/resources/unpacked/compiled/background/background.js"
                                           :output-dir    "test/marion/resources/unpacked/compiled/background"
                                           :asset-path    "compiled/background"
                                           :optimizations :none
                                           :source-map    true}}

                           :marion-content-script
                           {:source-paths ["src/settings"
                                           "src/shared"
                                           "test/marion/src/content_script"]
                            :compiler     {:output-to             "test/marion/resources/unpacked/compiled/content_script/content_script.js"
                                           :output-dir            "test/marion/resources/unpacked/compiled/content_script"
                                           :asset-path            "compiled/content_script"
                                           :optimizations         :whitespace                                                 ; content scripts cannot do eval / load script dynamically
                                           :anon-fn-naming-policy :unmapped
                                           :pretty-print          true
                                           :source-map            "test/marion/resources/unpacked/compiled/content_script/content_script.js.map"}}}}}

             :dirac-unpacked
             {:figwheel  {:server-port    7100
                          :server-logfile ".figwheel_dirac.log"
                          :repl           false}
              :cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["src/settings"
                                           "src/implant"
                                           "src/lib"
                                           "src/project"]
                            :compiler     {:output-to     "resources/unpacked/devtools/front_end/dirac/compiled/implant/implant.js"
                                           :output-dir    "resources/unpacked/devtools/front_end/dirac/compiled/implant"
                                           :asset-path    "dirac/compiled/implant"
                                           :optimizations :none
                                           :source-map    true}}

                           :dirac-background
                           {:source-paths ["src/settings"
                                           "src/dev"
                                           "src/lib"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/project"
                                           "src/background"]
                            :compiler     {:output-to     "resources/unpacked/compiled/background/dirac.js"
                                           :output-dir    "resources/unpacked/compiled/background"
                                           :asset-path    "compiled/background"
                                           :optimizations :none
                                           :source-map    true}}
                           :dirac-options
                           {:source-paths ["src/settings"
                                           "src/dev"
                                           "src/lib"
                                           "src/figwheel"
                                           "src/shared"
                                           "src/project"
                                           "src/options"]
                            :compiler     {:output-to     "resources/unpacked/compiled/options/dirac.js"
                                           :output-dir    "resources/unpacked/compiled/options"
                                           :asset-path    "compiled/options"
                                           :optimizations :none
                                           :source-map    true}}}}}
             :dirac-packed
             {:env       {:chromex-elide-verbose-logging "true"}
              :cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["src/settings"
                                           "src/implant"
                                           "src/lib"
                                           "src/project"]
                            :compiler     {:output-to     "resources/release/devtools/front_end/dirac/compiled/implant/implant.js"
                                           :output-dir    "resources/release/devtools/front_end/dirac/compiled/implant"
                                           :asset-path    "dirac/compiled/implant"
                                           :optimizations :advanced
                                           :elide-asserts true}}
                           :dirac-background
                           {:source-paths ["src/settings"
                                           "src/rel"
                                           "src/lib"
                                           "src/shared"
                                           "src/project"
                                           "src/background"]
                            :compiler     {:output-to     "resources/release/compiled/background.js"
                                           :output-dir    "resources/release/compiled/background"
                                           :asset-path    "compiled/background"
                                           :optimizations :advanced
                                           :elide-asserts true}}
                           :dirac-options
                           {:source-paths ["src/settings"
                                           "src/rel"
                                           "src/lib"
                                           "src/shared"
                                           "src/project"
                                           "src/options"]
                            :compiler     {:output-to     "resources/release/compiled/options.js"
                                           :output-dir    "resources/release/compiled/options"
                                           :asset-path    "compiled/options"
                                           :optimizations :advanced
                                           :elide-asserts true}}}}}

             :pseudo-names
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:compiler {:pseudo-names true}}
                           :dirac-background
                           {:compiler {:pseudo-names true}}
                           :dirac-options
                           {:compiler {:pseudo-names true}}}}}

             :parallel-build
             {}
             #_{:cljsbuild {:builds
                            {:dirac-implant
                             {:compiler {:parallel-build true}}
                             :dirac-background
                             {:compiler {:parallel-build true}}
                             :dirac-options
                             {:compiler {:parallel-build true}}
                             :marion-background
                             {:compiler {:parallel-build true}}
                             :marion-content-script
                             {:compiler {:parallel-build true}}
                             :tests
                             {:compiler {:parallel-build true}}}}}

             ; DON'T FORGET TO UPDATE scripts/ensure-checkouts.sh
             :checkouts
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}
                           :dirac-background
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}
                           :dirac-options
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}
                           :marion-background
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}
                           :marion-content-script
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}
                           :tests
                           {:source-paths ["checkouts/cljs-devtools/src"
                                           "checkouts/chromex/src/lib"
                                           "checkouts/chromex/src/exts"]
                            :compiler     {}}}}}

             :nuke-aliases
             {:aliases ^:replace {}}

             :dev-browser-tests
             {:cooper {"fixtures-server" ["scripts/launch-fixtures-server.sh"]
                       "test-canary"     ["scripts/launch-test-canary.sh"]
                       "fig-dirac"       ["scripts/launch-after-test-canary.sh"
                                          "lein fig-dirac"]
                       "fig-marion"      ["scripts/launch-after-test-canary.sh"
                                          "lein fig-marion"]
                       "marion-cs"       ["scripts/launch-after-test-canary.sh"
                                          "lein auto-compile-marion-cs"]
                       "browser-tests"   ["scripts/launch-after-test-canary.sh"
                                          "lein auto-compile-browser-tests"]}}}

  ; to develop browser tests:
  ;
  ; ./scripts/dev-browser-tests.sh
  ;
  ; after first launch you might need to reload extensions at chrome://extensions
  ; because initial cljs compilation is slower than chrome launch
  ;   * 'dirac' should point to 'resources/unpacked'
  ;   * 'marion' should point to 'test/marion/resources/unpacked'
  ;
  ; dev fixtures server is running at http://localhost:9080


  :aliases {"check"                      ["shell" "scripts/check-code.sh"]
            "test"                       ["shell" "scripts/test-all.sh"]

            "test-backend"               ["run-backend-tests"]
            "test-browser"               ["do"                                                                                ; this will run browser tests against fully optimized dirac extension (release build)
                                          "compile-browser-tests,"
                                          "release,"                                                                          ; = compile-dirac and devtools plus some cleanup, see scripts/release.sh
                                          "compile-marion,"
                                          "run-browser-tests"]
            "test-browser-dev"           ["do"                                                                                ; this will run browser tests against unpacked dirac extension
                                          "compile-browser-tests,"
                                          "compile-dirac-dev,"
                                          "compile-marion,"
                                          "run-browser-tests-dev"]
            "dev-browser-tests"          ["with-profile" "+cooper,+dev-browser-tests" "cooper"]

            "run-backend-tests"          ["with-profile" "+test-runner" "run" "-m" "dirac.backend-tests-runner"]
            "run-browser-tests"          ["with-profile" "+test-runner" "run" "-m" "dirac.browser-tests-runner"]
            "run-browser-tests-dev"      ["with-profile" "+test-runner" "run" "-m" "dirac.browser-tests-runner/-dev-main"]

            "fig-dirac"                  ["with-profile" "+dirac-unpacked,+cljs,+checkouts"
                                          "figwheel"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac-dev"          ["with-profile" "+cljs,+dirac-unpacked,+checkouts,+parallel-build"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "auto-compile-dirac-dev"     ["with-profile" "+cljs,+dirac-unpacked,+checkouts,+parallel-build"
                                          "cljsbuild" "auto"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac"              ["with-profile" "+dirac-packed,+cljs,+parallel-build"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "fig-marion"                 ["with-profile" "+cljs,+marion,+checkouts"
                                          "figwheel"
                                          "marion-background"]
            "compile-marion"             ["with-profile" "+cljs,+marion,+checkouts"
                                          "cljsbuild" "once"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion"        ["with-profile" "+cljs,+marion,+checkouts"
                                          "cljsbuild" "auto"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion-cs"     ["with-profile" "+cljs,+marion,+checkouts"
                                          "cljsbuild" "auto"
                                          "marion-content-script"]

            "compile-browser-tests"      ["with-profile" "+cljs,+browser-tests,+checkouts,+parallel-build"
                                          "cljsbuild" "once" "tests"]
            "auto-compile-browser-tests" ["with-profile" "+cljs,+browser-tests,+checkouts,+parallel-build"
                                          "cljsbuild" "auto" "tests"]

            "release"                    ["shell" "scripts/release.sh"]
            "package"                    ["shell" "scripts/package.sh"]
            "jar"                        ["shell" "scripts/lein-lib-without-checkouts.sh" "jar"]
            "install"                    ["shell" "scripts/lein-lib-without-checkouts.sh" "install"]
            "uberjar"                    ["shell" "scripts/lein-lib-without-checkouts.sh" "uberjar"]
            "regenerate"                 ["shell" "scripts/regenerate.sh"]})