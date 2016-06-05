(defproject binaryage/dirac "0.6.0"
  :description "Dirac DevTools - a Chrome DevTools fork for ClojureScript developers."
  :url "https://github.com/binaryage/dirac"
  :license {:name         "MIT License"
            :url          "http://opensource.org/licenses/MIT"
            :distribution :repo}
  :scm {:name "git"
        :url  "https://github.com/binaryage/dirac"}

  :dependencies [[org.clojure/clojure "1.8.0" :scope "provided"]
                 [org.clojure/clojurescript "1.9.36" :scope "provided"]
                 [org.clojure/core.async "0.2.374"]
                 [org.clojure/tools.logging "0.3.1"]
                 [org.clojure/tools.cli "0.3.5"]
                 [org.clojure/tools.nrepl "0.2.12"]
                 [http-kit "2.1.21-alpha2"]
                 [clj-logging-config "1.9.12"]
                 [version-clj "0.1.2"]
                 [environ "1.0.3"]
                 [clansi "1.0.0"]
                 [funcool/cuerdas "0.7.2"]

                 ; we cannot use :dependencies under individual profiles because Cursive recognizes only root level
                 ; thus we mark extra deps with :scope "test" and filter them later when producing jar library
                 [binaryage/chromex "0.4.0" :scope "test"]
                 [binaryage/devtools "0.6.1" :scope "test"]
                 [cljs-http "0.1.40" :scope "test"]
                 [figwheel "0.5.3-2" :scope "test"]
                 [reforms "0.4.3" :scope "test"]
                 [rum "0.9.0" :scope "test"]
                 [rum-reforms "0.4.3" :scope "test"]
                 [cljsjs/parinfer "1.8.1-0" :scope "test"]
                 [com.lucasbradstreet/cljs-uuid-utils "1.0.2" :scope "test"]
                 [com.rpl/specter "0.11.0" :scope "test"]
                 [org.clojure/tools.namespace "0.3.0-alpha3" :scope "test"]
                 [org.clojure/tools.reader "1.0.0-beta1" :scope "test"]
                 [com.cognitect/transit-clj "0.8.285" :scope "test"]

                 [http.async.client "1.1.0" :scope "test"]
                 [org.slf4j/slf4j-log4j12 "1.7.21" :scope "test"]

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

  ; this effectively disables checkouts and gives us a chance to re-enable them on per-profile basis, see :checkouts profile
  ; http://jakemccrary.com/blog/2015/03/24/advanced-leiningen-checkouts-configuring-what-ends-up-on-your-classpath/
  :checkout-deps-shares ^:replace []

  :plugins [[lein-shell "0.5.0"]
            [lein-environ "1.0.3"]]

  ;  :jvm-opts ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005"]

  :source-paths ["src/agent"
                 "src/automation"
                 "src/background"
                 "src/backport"
                 "src/dev"
                 "src/figwheel"
                 "src/implant"
                 "src/lib"
                 "src/logging"
                 "src/nrepl"
                 "src/options"
                 "src/project"
                 "src/rel"
                 "src/runtime"
                 "src/settings"
                 "src/shared"
                 "src/test"

                 "test/backend/src"
                 "test/browser/fixtures"
                 "test/browser/src"
                 "test/marion/src"]
  :resource-paths ["resources"]                                                                                               ; this is for Cursive, will be redefined by profiles
  :test-paths ["test"]                                                                                                        ; this is for Cursive, will be redefined by profiles

  ; unfortunately this must be on root level because leiningen does not properly merge metadata
  ;   see https://github.com/technomancy/leiningen/issues/1826
  ;   ! be careful with lein clean or tasks which do cleaning implicitly, this will wipe out all generated files
  :clean-targets ^{:protect false} ["target"
                                    ; also update scripts/clean-compiled.sh
                                    "resources/unpacked/compiled"
                                    "resources/unpacked/devtools/front_end/dirac/compiled"
                                    "test/browser/fixtures/resources/compiled"
                                    "test/marion/resources/unpacked/compiled"]

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
                                          "src/backport"
                                          "src/logging"
                                          "src/runtime"
                                          "src/lib"
                                          "src/agent"
                                          "src/nrepl"]
               :resource-paths ^:replace []
               :test-paths     ^:replace []}]

             :clojure17
             {:dependencies [[org.clojure/clojure "1.7.0" :scope "provided"]]}

             :clojure19
             {:dependencies [[org.clojure/clojure "1.9.0-alpha4" :scope "provided"]]}

             :cooper
             {:plugins [[lein-cooper "1.2.2"]]}

             :cljs
             {:plugins [[lein-cljsbuild "1.1.3"]
                        [lein-figwheel "0.5.3-2"]]
              :hooks   [leiningen.cljsbuild]}

             :test-runner
             {:source-paths ^:replace ["src/project"
                                       "src/settings"
                                       "src/backport"
                                       "src/logging"
                                       "src/lib"
                                       "src/agent"
                                       "src/nrepl"
                                       "src/shared"
                                       "test/browser/fixtures/src/tests"]
              :test-paths   ["src/test"
                             "test/browser/src"
                             "test/backend/src"]}

             :browser-tests
             {:cljsbuild {:builds
                          {:tests
                           {; HACK: we rely on figwheel's "rel=<timestamp>" into cljs url params, clean-urls tests depend on it
                            :figwheel       {:server-port    7300
                                             :server-logfile ".figwheel_tests.log"
                                             :repl           false}
                            :notify-command ["scripts/cljsbuild-notify.sh" "tests"]
                            :source-paths   ["src/settings"
                                             "src/project"
                                             "src/backport"
                                             "src/lib"
                                             "src/dev"
                                             "src/automation"
                                             "src/runtime"
                                             "src/test"
                                             "src/shared"
                                             "src/agent"
                                             "src/nrepl"
                                             "test/browser/fixtures/src/tests"]
                            :compiler       {:output-to            "test/browser/fixtures/resources/compiled/tests/tests.js"
                                             :output-dir           "test/browser/fixtures/resources/compiled/tests"
                                             :asset-path           "compiled/tests"
                                             :optimizations        :none                                                      ; we rely on optimizations :none in test runner
                                             :source-map           true
                                             :source-map-timestamp true}}}}}

             :marion-figwheel
             {:figwheel {:server-port    7200
                         :server-logfile ".figwheel_marion.log"
                         :repl           false}}

             :marion
             {:cljsbuild {:builds
                          {:marion-background
                           {:notify-command ["scripts/cljsbuild-notify.sh" "marion-background"]
                            :source-paths   ["src/settings"
                                             "src/shared"
                                             "test/marion/src/dev"
                                             "test/marion/src/background"]
                            :compiler       {:output-to     "test/marion/resources/unpacked/compiled/background/background.js"
                                             :output-dir    "test/marion/resources/unpacked/compiled/background"
                                             :asset-path    "compiled/background"
                                             :optimizations :none
                                             :source-map    true}}

                           :marion-content-script
                           {:notify-command ["scripts/cljsbuild-notify.sh" "marion-content-script"]
                            :source-paths   ["src/settings"
                                             "src/shared"
                                             "test/marion/src/dev"
                                             "test/marion/src/content_script"]
                            :compiler       {:output-to              "test/marion/resources/unpacked/compiled/content_script/content_script.js"
                                             :output-dir             "test/marion/resources/unpacked/compiled/content_script"
                                             :asset-path             "compiled/content_script"
                                             :closure-output-charset "US-ASCII"
                                             :optimizations          :whitespace                                              ; content scripts cannot do eval / load script dynamically
                                             :pretty-print           true
                                             :source-map             "test/marion/resources/unpacked/compiled/content_script/content_script.js.map"}}}}}

             :dirac-figwheel
             {:figwheel {:server-port    7100
                         :server-logfile ".figwheel_dirac.log"
                         :repl           false}}

             :dirac-unpacked
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-implant"]
                            :source-paths   ["src/settings"
                                             "src/implant"
                                             "src/lib"
                                             "src/project"]
                            :compiler       {:output-to     "resources/unpacked/devtools/front_end/dirac/compiled/implant/implant.js"
                                             :output-dir    "resources/unpacked/devtools/front_end/dirac/compiled/implant"
                                             :asset-path    "dirac/compiled/implant"
                                             :optimizations :none
                                             :source-map    true}}

                           :dirac-background
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-background"]
                            :source-paths   ["src/settings"
                                             "src/dev"
                                             "src/lib"
                                             "src/figwheel"
                                             "src/shared"
                                             "src/project"
                                             "src/background"]
                            :compiler       {:output-to     "resources/unpacked/compiled/background/dirac.js"
                                             :output-dir    "resources/unpacked/compiled/background"
                                             :asset-path    "compiled/background"
                                             :optimizations :none
                                             :source-map    true}}
                           :dirac-options
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-options"]
                            :source-paths   ["src/settings"
                                             "src/dev"
                                             "src/lib"
                                             "src/figwheel"
                                             "src/shared"
                                             "src/project"
                                             "src/options"]
                            :compiler       {:output-to     "resources/unpacked/compiled/options/dirac.js"
                                             :output-dir    "resources/unpacked/compiled/options"
                                             :asset-path    "compiled/options"
                                             :optimizations :none
                                             :source-map    true}}}}}
             :dirac-packed
             ; note: we want to compile under target folder to prevent unnecessary recompilations after running ./scripts/release.sh
             ;       the script will copy most recent build over
             {:env       {:chromex-elide-verbose-logging "true"}
              :cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["src/settings"
                                           "src/implant"
                                           "src/lib"
                                           "src/project"]
                            :compiler     {:output-to     "target/resources/release/devtools/front_end/dirac/compiled/implant/implant.js"
                                           :output-dir    "target/resources/release/devtools/front_end/dirac/compiled/implant"
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
                            :compiler     {:output-to     "target/resources/release/compiled/background.js"
                                           :output-dir    "target/resources/release/compiled/background"
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
                            :compiler     {:output-to     "target/resources/release/compiled/options.js"
                                           :output-dir    "target/resources/release/compiled/options"
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
             {:cljsbuild {:builds
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
             {:checkout-deps-shares ^:replace [:source-paths
                                               :test-paths
                                               :resource-paths
                                               :compile-path
                                               #=(eval leiningen.core.classpath/checkout-deps-paths)]
              :cljsbuild            {:builds
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

             ; to develop browser tests:
             ;
             ; ./scripts/dev-browser-tests.sh
             ;
             ; after first launch you might need to reload extensions at chrome://extensions
             ;   * 'dirac' should point to 'resources/unpacked'
             ;   * 'marion' should point to 'test/marion/resources/unpacked'
             ;
             ; dev fixtures server is running at http://localhost:9080
             :dev-browser-tests
             {:cooper {"fixtures-server" ["scripts/launch-fixtures-server.sh"]
                       "dev-agent"       ["lein" "run-browser-tests-agent"]
                       "fig-dirac"       ["lein" "fig-dirac"]
                       "fig-marion"      ["lein" "fig-marion"]
                       "marion-cs"       ["lein" "auto-compile-marion-cs"]
                       "tests"           ["lein" "auto-compile-browser-tests"]
                       "browser"         ["scripts/launch-test-browser.sh"]}}}

  :aliases {"check"                      ["shell" "scripts/check-code.sh"]
            "test"                       ["shell" "scripts/test-all.sh"]

            "test-backend"               ["run-backend-tests"]
            "test-browser"               ["do"                                                                                ; this will run browser tests against fully optimized dirac extension (release build)
                                          "compile-browser-tests,"
                                          "compile-marion,"
                                          "release,"                                                                          ; = compile-dirac and devtools plus some cleanup, see scripts/release.sh
                                          "run-browser-tests"]
            "test-browser-dev"           ["do"                                                                                ; this will run browser tests against unpacked dirac extension
                                          "compile-browser-tests,"
                                          "compile-dirac-dev,"
                                          "compile-marion,"
                                          "run-browser-tests-dev"]
            "dev-browser-tests"          ["shell" "scripts/dev-browser-tests.sh"]
            "run-backend-tests"          ["shell" "scripts/run-backend-tests.sh"]
            "run-backend-tests-default"  ["with-profile" "+test-runner" "run" "-m" "dirac.backend-tests-runner"]
            "run-backend-tests-17"       ["with-profile" "+test-runner,+clojure17" "run" "-m" "dirac.backend-tests-runner"]
            "run-backend-tests-19"       ["with-profile" "+test-runner,+clojure19" "run" "-m" "dirac.backend-tests-runner"]
            "run-browser-tests"          ["shell" "scripts/run-browser-tests.sh" "dirac.browser-tests-runner"]
            "run-browser-tests-dev"      ["shell" "scripts/run-browser-tests.sh" "dirac.browser-tests-runner/-dev-main"]
            "run-browser-tests-agent"    ["with-profile" "+test-runner" "run" "-m" "dirac.browser-tests-runner/run-agent"]

            "fig-dirac"                  ["with-profile" "+cljs,+checkouts,+dirac-unpacked,+dirac-figwheel"
                                          "figwheel"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac-dev"          ["with-profile" "+cljs,+checkouts,+parallel-build,+dirac-unpacked"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "auto-compile-dirac-dev"     ["with-profile" "+cljs,+checkouts,+parallel-build,+dirac-unpacked"
                                          "cljsbuild" "auto"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac"              ["with-profile" "+cljs,+parallel-build,+dirac-packed"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "fig-marion"                 ["with-profile" "+cljs,+checkouts,+marion,+marion-figwheel"
                                          "figwheel"
                                          "marion-background"]
            "compile-marion"             ["with-profile" "+cljs,+parallel-build,+marion"
                                          "cljsbuild" "once"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion"        ["with-profile" "+cljs,+checkouts,+parallel-build,+marion"
                                          "cljsbuild" "auto"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion-cs"     ["with-profile" "+cljs,+checkouts,+parallel-build,+marion"
                                          "cljsbuild" "auto"
                                          "marion-content-script"]

            "compile-browser-tests"      ["with-profile" "+cljs,+checkouts,+parallel-build,+browser-tests"
                                          "cljsbuild" "once" "tests"]
            "auto-compile-browser-tests" ["with-profile" "+cljs,+checkouts,+parallel-build,+browser-tests"
                                          "cljsbuild" "auto" "tests"]

            "clean-compiled"             ["shell" "scripts/clean-compiled.sh"]

            "release"                    ["shell" "scripts/release.sh"]
            "package"                    ["shell" "scripts/package.sh"]
            "install"                    ["shell" "scripts/local-install.sh"]
            "publish"                    ["shell" "scripts/deploy-clojars.sh"]
            "regenerate"                 ["shell" "scripts/regenerate.sh"]})