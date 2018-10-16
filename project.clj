(def clj-logging-config-version "1.9.12")
(def slf4j-log4j12-version "1.7.25")
(def figwheel-version "0.5.16")
(def selected-clojurescript-version "1.10.339")
(def selected-clojure-version "1.9.0")
(def selenium-version "3.14.0")
(def lein-cljsbuild-version "1.1.7")

(def provided-deps
  [['org.clojure/clojure selected-clojure-version :scope "provided"]
   ['org.clojure/clojurescript selected-clojurescript-version :scope "provided"]])

(def required-deps
  [['org.clojure/core.async "0.4.474"]
   ['org.clojure/tools.logging "0.4.1"]
   ['org.clojure/tools.cli "0.4.1"]
   ['org.clojure/tools.nrepl "0.2.13"]
   ['binaryage/env-config "0.2.2"]
   ['http-kit "2.3.0"]
   ['version-clj "0.1.2"]
   ['clansi "1.0.0"]
   ['funcool/cuerdas "2.0.6"]
   ['com.rpl/specter "1.1.1"]])

(def test-deps
  [; we cannot use :dependencies under individual profiles because Cursive recognizes only root level
   ; thus we mark extra deps with :scope "test" and filter them later when producing jar library
   ['binaryage/oops "0.6.2" :scope "test"]
   ['binaryage/chromex "0.6.4" :scope "test"]
   ['binaryage/devtools "0.9.10" :scope "test"]
   ['environ "1.1.0" :scope "test"]
   ['cljs-http "0.1.45" :scope "test"]
   ['figwheel figwheel-version :scope "test"]
   ['reforms "0.4.3" :scope "test"]
   ['rum "0.11.2" :scope "test"]
   ['rum-reforms "0.4.3" :scope "test"]
   ['com.lucasbradstreet/cljs-uuid-utils "1.0.2" :scope "test"]
   ['org.clojure/tools.namespace "0.3.0-alpha3" :scope "test"]
   ['org.clojure/tools.reader "1.3.0" :scope "test"]
   ['fipp "0.6.13" :scope "test"]

   ['clj-logging-config clj-logging-config-version :scope "test"]
   ['org.slf4j/slf4j-log4j12 slf4j-log4j12-version :scope "test"]

   ['http.async.client "1.3.0" :scope "test"]

   ['ring/ring-core "1.7.0" :scope "test"]
   ['ring/ring-devel "1.7.0" :scope "test"]
   ['clj-time "0.15.0" :scope "test"]

   ; guava is needed for selenium, they rely on latest guava which gets overridden by google closure compiler dep inside clojurescript
   ;[com.google.guava/guava "23.0" :scope "test" :upgrade false]
   ['org.seleniumhq.selenium/selenium-java selenium-version :scope "test"]
   ['org.seleniumhq.selenium/selenium-chrome-driver selenium-version :scope "test"]
   ['org.seleniumhq.selenium/selenium-support selenium-version :scope "test"]
   ['org.seleniumhq.selenium/selenium-api selenium-version :scope "test"]
   ['org.seleniumhq.selenium/selenium-htmlunit-driver "2.52.0" :scope "test"]])

(def lib-deps (concat provided-deps required-deps))
(def all-deps (concat lib-deps test-deps))

(defproject binaryage/dirac "1.2.40"
  :description "Dirac DevTools - a Chrome DevTools fork for ClojureScript developers."
  :url "https://github.com/binaryage/dirac"
  :license {:name         "MIT License"
            :url          "http://opensource.org/licenses/MIT"
            :distribution :repo}
  :scm {:name "git"
        :url  "https://github.com/binaryage/dirac"}

  :dependencies ~all-deps

  :plugins [[lein-shell "0.5.0"]
            [lein-environ "1.1.0"]]

  ; this is for Cursive, may be redefined by profiles
  :source-paths ["scripts"

                 "src/agent"
                 "src/automation"
                 "src/background"
                 "src/devtools"
                 "src/figwheel"
                 "src/implant"
                 "src/lib"
                 "src/nrepl"
                 "src/options"
                 "src/project"
                 "src/empty"
                 "src/runtime"
                 "src/settings"
                 "src/shared"
                 "src/logging"

                 "test/src/test_lib"
                 "test/src/webdriver"
                 "test/marion/src/background"
                 "test/marion/src/content_script"
                 "test/backend/src/backend_tests"
                 "test/browser/fixtures/src/scenarios01"
                 "test/browser/fixtures/src/scenarios02"
                 "test/browser/fixtures/src/scenarios03"
                 "test/browser/fixtures/src/tasks"
                 "test/browser/src/browser_tests"]
  :resource-paths ["resources"]
  :test-paths ["test"]

  ; unfortunately this must be on root level because leiningen does not properly merge metadata
  ;   see https://github.com/technomancy/leiningen/issues/1826
  ;   ! be careful with lein clean or tasks which do cleaning implicitly, this will wipe out all generated files
  :clean-targets ^{:protect false} ["target"
                                    "resources/release/.compiled"
                                    "resources/unpacked/.compiled"
                                    "resources/unpacked/devtools/front_end/dirac/.compiled"
                                    "test/browser/fixtures/resources/.compiled"
                                    "test/marion/resources/unpacked/.compiled"]

  :cljsbuild {:builds {}}                                                                                                     ; prevent https://github.com/emezeske/lein-cljsbuild/issues/413

  :env {:dirac-root ~(System/getProperty "user.dir")}

  :profiles {:lib
             ^{:pom-scope :provided}                                                                                          ; ! to overcome default jar/pom behaviour, our :dependencies replacement would be ignored for some reason
             [:nuke-aliases
              {:dependencies   ~(with-meta lib-deps {:replace true})
               :source-paths   ^:replace ["src/project"
                                          "src/settings"
                                          "src/runtime"
                                          "src/lib"
                                          "src/agent"
                                          "src/nrepl"]
               :resource-paths ^:replace []
               :test-paths     ^:replace []}]

             :logging-support
             ^{:pom-scope :provided}                                                                                          ; ! to overcome default jar/pom behaviour, our :dependencies replacement would be ignored for some reason
             {:dependencies [[clj-logging-config ~clj-logging-config-version :scope nil]
                             [org.slf4j/slf4j-log4j12 ~slf4j-log4j12-version :scope nil]]
              :source-paths ["src/logging"]}

             :lib-with-logging
             [:lib :logging-support]

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

             :clojure18
             {:dependencies [[org.clojure/clojure "1.8.0" :scope "provided" :upgrade false]]}

             :clojure19
             {:dependencies [[org.clojure/clojure ~selected-clojure-version :scope "provided" :upgrade false]]}

             :clojure110
             {:dependencies [[org.clojure/clojure "1.10.0-beta1" :scope "provided" :upgrade false]]}

             :cooper
             {:plugins [[lein-cooper "1.2.2"]]}

             :cljs
             {:plugins [[lein-cljsbuild ~lein-cljsbuild-version]
                        [lein-figwheel ~figwheel-version]]}

             :nuke-aliases
             {:aliases ^:replace {}}

             :test-runner
             {:source-paths ^:replace ["src/project"
                                       "src/settings"
                                       "src/lib"
                                       "src/agent"
                                       "src/nrepl"
                                       "src/shared"
                                       "src/logging"
                                       "test/src/test_lib"
                                       "test/src/webdriver"
                                       "test/browser/src/browser_tests"
                                       "test/backend/src/backend_tests"
                                       "test/browser/fixtures/src/tasks"
                                       "test/browser/fixtures/src/scenarios01"
                                       "test/browser/fixtures/src/scenarios02"
                                       "test/browser/fixtures/src/scenarios03"]}

             :browser-tests
             {:cljsbuild {:builds
                          {:tasks
                           {:notify-command ["scripts/cljsbuild-notify.sh" "tasks"]
                            :source-paths   ["src/settings"
                                             "src/project"
                                             "src/automation"
                                             "src/runtime"
                                             "src/shared"
                                             "src/logging"
                                             "test/browser/fixtures/src/tasks"]
                            :compiler       {:output-to            "test/browser/fixtures/resources/.compiled/tasks/main.js"
                                             :output-dir           "test/browser/fixtures/resources/.compiled/tasks"
                                             :optimizations        :none                                                      ; we rely on optimizations :none in test runner
                                             :source-map           true
                                             :source-map-timestamp true}}
                           :scenarios01
                           {; HACK: we rely on figwheel's "rel=<timestamp>" into cljs url params, clean-urls tests depend on it
                            :figwheel       {:server-port          7301
                                             :server-logfile       ".figwheel/scenarios01.log"
                                             :validate-interactive :start
                                             :repl                 false}
                            :notify-command ["scripts/cljsbuild-notify.sh" "scenarios01"]
                            :source-paths   ["src/settings"
                                             "src/project"
                                             "src/automation"
                                             "src/runtime"
                                             "src/shared"
                                             "src/logging"
                                             "test/browser/fixtures/src/scenarios01"]
                            :compiler       {:output-to            "test/browser/fixtures/resources/.compiled/scenarios01/main.js"
                                             :output-dir           "test/browser/fixtures/resources/.compiled/scenarios01"
                                             :optimizations        :none
                                             :source-map           true
                                             :source-map-timestamp true}}
                           :scenarios02
                           {:notify-command ["scripts/cljsbuild-notify.sh" "scenarios02"]
                            :source-paths   ["src/settings"
                                             "src/project"
                                             "src/automation"
                                             "src/runtime"
                                             "src/shared"
                                             "src/logging"
                                             "test/browser/fixtures/src/scenarios02"]
                            :compiler       {:output-to            "test/browser/fixtures/resources/.compiled/scenarios02/main.js"
                                             :output-dir           "test/browser/fixtures/resources/.compiled/scenarios02"
                                             :asset-path           "../.compiled/scenarios02"
                                             :optimizations        :none
                                             :main                 dirac.tests.scenarios.normal-via-preloads
                                             :preloads             [dirac.runtime.preload]
                                             :external-config      {:dirac.runtime/config {:external-config-setting "configured externally"}}
                                             :source-map           true
                                             :source-map-timestamp true}}

                           :scenarios03
                           {:notify-command ["scripts/cljsbuild-notify.sh" "scenarios03"]
                            :source-paths   ["src/settings"
                                             "src/project"
                                             "src/automation"
                                             "src/runtime"
                                             "src/shared"
                                             "src/logging"
                                             "test/browser/fixtures/src/scenarios03"]
                            :compiler       {:output-to            "test/browser/fixtures/resources/.compiled/scenarios03/main.js"
                                             :output-dir           "test/browser/fixtures/resources/.compiled/scenarios03"
                                             :asset-path           "../.compiled/scenarios03"
                                             :optimizations        :none
                                             :source-map           true
                                             :source-map-timestamp true}}}}}

             :marion-figwheel
             {:figwheel {:server-port          7200
                         :server-logfile       ".figwheel/marion.log"
                         :validate-interactive :start
                         :repl                 false}}

             :marion
             {:cljsbuild {:builds
                          {:marion-background
                           {:notify-command ["scripts/cljsbuild-notify.sh" "marion-background"]
                            :source-paths   ["src/settings"
                                             "src/devtools"
                                             "src/shared"
                                             "src/logging"
                                             "test/marion/src/background"]
                            :compiler       {:output-to       "test/marion/resources/unpacked/.compiled/background/background.js"
                                             :output-dir      "test/marion/resources/unpacked/.compiled/background"
                                             :external-config {:devtools/config {:dont-detect-custom-formatters true}}
                                             :optimizations   :none
                                             :source-map      true}}

                           :marion-content-script
                           {:notify-command ["scripts/cljsbuild-notify.sh" "marion-content-script"]
                            :source-paths   ["src/settings"
                                             "src/shared"
                                             "src/logging"
                                             "test/marion/src/content_script"]
                            :compiler       {:output-to              "test/marion/resources/unpacked/.compiled/content_script/content_script.js"
                                             :output-dir             "test/marion/resources/unpacked/.compiled/content_script"
                                             :closure-output-charset "US-ASCII"
                                             :external-config        {:devtools/config {:silence-optimizations-warning true
                                                                                        :dont-detect-custom-formatters true}}
                                             :optimizations          :whitespace                                              ; content scripts cannot do eval / load script dynamically
                                             :pretty-print           true
                                             :source-map             "test/marion/resources/unpacked/.compiled/content_script/content_script.js.map"}}}}}

             :dirac-figwheel
             {:figwheel {:server-port          7100
                         :server-logfile       ".figwheel/dirac.log"
                         :validate-interactive :start
                         :repl                 false}}

             :dirac-unpacked
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-implant"]
                            :source-paths   ["src/settings"
                                             "src/lib"
                                             "src/shared"
                                             "src/logging"
                                             "src/project"
                                             "src/devtools"
                                             "src/options"
                                             "src/implant"]
                            :compiler       {:output-to       "resources/unpacked/devtools/front_end/dirac/.compiled/implant/implant.js"
                                             :output-dir      "resources/unpacked/devtools/front_end/dirac/.compiled/implant"
                                             :external-config {:devtools/config {:dont-detect-custom-formatters true}}
                                             :optimizations   :none
                                             :source-map      true}}

                           :dirac-background
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-background"]
                            :source-paths   ["src/settings"
                                             "src/lib"
                                             "src/figwheel"
                                             "src/shared"
                                             "src/logging"
                                             "src/project"
                                             "src/devtools"
                                             "src/options"
                                             "src/background"]
                            :compiler       {:output-to       "resources/unpacked/.compiled/background/dirac.js"
                                             :output-dir      "resources/unpacked/.compiled/background"
                                             :external-config {:devtools/config {:dont-detect-custom-formatters true}}
                                             :optimizations   :none
                                             :source-map      true}}
                           :dirac-options
                           {:notify-command ["scripts/cljsbuild-notify.sh" "dirac-options"]
                            :source-paths   ["src/settings"
                                             "src/lib"
                                             "src/figwheel"
                                             "src/shared"
                                             "src/logging"
                                             "src/project"
                                             "src/devtools"
                                             "src/options"]
                            :compiler       {:output-to       "resources/unpacked/.compiled/options/dirac.js"
                                             :output-dir      "resources/unpacked/.compiled/options"
                                             :external-config {:devtools/config {:dont-detect-custom-formatters true}}
                                             :optimizations   :none
                                             :source-map      true}}}}}
             :dirac-packed
             ; note: we want to compile under target folder to prevent unnecessary recompilations after running ./scripts/release.sh
             ;       the script will copy most recent build over
             {:env       {:chromex-elide-verbose-logging "true"}
              :cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["src/settings"
                                           "src/lib"
                                           "src/shared"
                                           "src/logging"
                                           "src/project"
                                           "src/implant"]
                            :compiler     {:output-to     "target/resources/release/devtools/front_end/dirac/.compiled/implant/implant.js"
                                           :output-dir    "target/resources/release/devtools/front_end/dirac/.compiled/implant"
                                           :main          dirac.implant
                                           :optimizations :advanced
                                           :elide-asserts true}}
                           :dirac-background
                           {:source-paths ["src/settings"
                                           "src/lib"
                                           "src/shared"
                                           "src/logging"
                                           "src/project"
                                           "src/background"]
                            :compiler     {:output-to     "target/resources/release/.compiled/background.js"
                                           :output-dir    "target/resources/release/.compiled/background"
                                           :optimizations :advanced
                                           :main          dirac.background
                                           :elide-asserts true}}
                           :dirac-options
                           {:source-paths ["src/settings"
                                           "src/lib"
                                           "src/shared"
                                           "src/logging"
                                           "src/project"
                                           "src/options"]
                            :compiler     {:output-to     "target/resources/release/.compiled/options.js"
                                           :output-dir    "target/resources/release/.compiled/options"
                                           :optimizations :advanced
                                           :main          dirac.options
                                           :elide-asserts true}}}}}

             ; want to use technique of overlaying related compiler options on top of our default configuration to all builds
             ; the problem is cljsbuild's logic for adding default/missing options to :cljsbuild config maps
             ; sure, we can overlay :builds with profiles, but build-ids which end up not having :source-paths will
             ; get assigned "src-cljs" for some silly reason which goes beyond my imagination
             ; we fight it by assigning an empty existing :source-paths to all our possible build-ids
             ; to prevent cljsbuild to assign their defaults
             :prevent-cljsbuild-defaults
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:source-paths ["src/empty"]}
                           :dirac-background
                           {:source-paths ["src/empty"]}
                           :dirac-options
                           {:source-paths ["src/empty"]}
                           :marion-background
                           {:source-paths ["src/empty"]}
                           :marion-content-script
                           {:source-paths ["src/empty"]}
                           :tasks
                           {:source-paths ["src/empty"]}
                           :scenarios01
                           {:source-paths ["src/empty"]}
                           :scenarios02
                           {:source-paths ["src/empty"]}
                           :scenarios03
                           {:source-paths ["src/empty"]}}}}

             :pseudo-names
             [:prevent-cljsbuild-defaults
              {:cljsbuild {:builds
                           {:dirac-implant
                            {:compiler {:pseudo-names true}}
                            :dirac-background
                            {:compiler {:pseudo-names true}}
                            :dirac-options
                            {:compiler {:pseudo-names true}}}}}]

             :parallel-build
             [:prevent-cljsbuild-defaults
              ; parallel builds were causing random stack overflows like
              ; https://travis-ci.org/binaryage/dirac/jobs/437984389#L1126
              ; => stop using it for now, and wait
              ;{:cljsbuild {:builds
              ;             {:dirac-implant
              ;              {:compiler {:parallel-build true}}
              ;              :dirac-background
              ;              {:compiler {:parallel-build true}}
              ;              :dirac-options
              ;              {:compiler {:parallel-build true}}
              ;              :marion-background
              ;              {:compiler {:parallel-build true}}
              ;              :marion-content-script
              ;              {:compiler {:parallel-build true}}
              ;              :tasks
              ;              {:compiler {:parallel-build true}}
              ;              :scenarios01
              ;              {:compiler {:parallel-build true}}
              ;              :scenarios02
              ;              {:compiler {:parallel-build true}}
              ;              :scenarios03
              ;              {:compiler {:parallel-build true}}}}}
              ]

             :dirac-whitespace
             {:cljsbuild {:builds
                          {:dirac-implant
                           {:compiler {:optimizations          :whitespace
                                       :pretty-print           true
                                       :closure-output-charset "US-ASCII"}}
                           :dirac-background
                           {:compiler {:optimizations          :whitespace
                                       :pretty-print           true
                                       :closure-output-charset "US-ASCII"}}
                           :dirac-options
                           {:compiler {:optimizations          :whitespace
                                       :pretty-print           true
                                       :closure-output-charset "US-ASCII"}}}}}

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
                       "browser"         ["scripts/launch-test-browser.sh"]}}
             :dev-dirac-sample
             {:cooper {"fig-dirac"     ["lein" "fig-dirac"]
                       "fig-marion"    ["lein" "fig-marion"]
                       "marion-cs"     ["lein" "auto-compile-marion-cs"]
                       "fig-sample"    ["scripts/dev-sample.sh" "dev-fig"]
                       "server-sample" ["scripts/dev-sample.sh" "dev-server"]
                       "browser"       ["scripts/launch-sample-browser.sh"]}}}

  :aliases {"check"                      ["shell" "scripts/check-code.sh"]
            "test"                       ["shell" "scripts/test-all.sh"]

            "test-backend"               ["shell" "scripts/test-backend.sh"]
            "test-browser"               ["shell" "scripts/test-browser.sh"]                                                  ; this will run browser tests against fully optimized dirac extension (release build)
            "test-browser-dev"           ["shell" "scripts/test-browser-dev.sh"]                                              ; this will run browser tests against unpacked dirac extension

            "run-backend-tests-18"       ["with-profile" "+test-runner,+clojure18" "run" "-m" "dirac.tests.backend.runner"]
            "run-backend-tests-19"       ["with-profile" "+test-runner,+clojure19" "run" "-m" "dirac.tests.backend.runner"]
            "run-backend-tests-110"      ["with-profile" "+test-runner,+clojure110" "run" "-m" "dirac.tests.backend.runner"]

            "run-browser-tests"          ["shell" "scripts/run-browser-tests.sh" "dirac.tests.browser.runner"]
            "run-browser-tests-dev"      ["shell" "scripts/run-browser-tests.sh" "dirac.tests.browser.runner/-dev-main"]
            "run-browser-tests-agent"    ["with-profile" "+test-runner,+debugger-5005" "run" "-m" "dirac.tests.browser.runner/run-agent"]

            "dev-browser-tests"          ["shell" "scripts/dev-browser-tests.sh"]
            "dev-dirac-sample"           ["shell" "scripts/dev-dirac-sample.sh"]

            "fig-dirac"                  ["with-profile" "+cljs,+dirac-unpacked,+dirac-figwheel"
                                          "figwheel"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac-dev"          ["with-profile" "+cljs,+parallel-build,+dirac-unpacked"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "auto-compile-dirac-dev"     ["with-profile" "+cljs,+parallel-build,+dirac-unpacked"
                                          "cljsbuild" "auto"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac"              ["with-profile" "+cljs,+parallel-build,+dirac-packed"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac-pseudo-names" ["with-profile" "+cljs,+parallel-build,+dirac-packed,+pseudo-names"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "compile-dirac-whitespace"   ["with-profile" "+cljs,+parallel-build,+dirac-packed,+dirac-whitespace"
                                          "cljsbuild" "once"
                                          "dirac-background" "dirac-options" "dirac-implant"]
            "fig-marion"                 ["with-profile" "+cljs,+marion,+marion-figwheel"
                                          "figwheel"
                                          "marion-background"]
            "compile-marion"             ["with-profile" "+cljs,+parallel-build,+marion"
                                          "cljsbuild" "once"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion"        ["with-profile" "+cljs,+parallel-build,+marion"
                                          "cljsbuild" "auto"
                                          "marion-background" "marion-content-script"]
            "auto-compile-marion-cs"     ["with-profile" "+cljs,+parallel-build,+marion"
                                          "cljsbuild" "auto"
                                          "marion-content-script"]

            "compile-browser-tests"      ["with-profile" "+cljs,+parallel-build,+browser-tests"
                                          "cljsbuild" "once"]
            "auto-compile-browser-tests" ["with-profile" "+cljs,+parallel-build,+browser-tests"
                                          "cljsbuild" "auto"]

            "release"                    ["shell" "scripts/release.sh"]
            "package"                    ["shell" "scripts/package.sh"]
            "install"                    ["shell" "scripts/local-install.sh"]
            "install-with-logging"       ["shell" "scripts/local-install.sh" "lib-with-logging"]
            "publish"                    ["shell" "scripts/deploy-clojars.sh"]
            "regenerate"                 ["shell" "scripts/regenerate.sh"]})
