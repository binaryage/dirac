(ns dirac.tests.scenarios.runtime-api
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario :refer-macros [flush-transcript! with-feedback]]
            [dirac.settings]
            [dirac.runtime :as runtime]
            [dirac.runtime.util :as runtime-util]
            [clojure.string :as string]))

(defn replace-lib-info [s]
  (let [lib-info (runtime-util/get-lib-info)]
    (string/replace s lib-info "**LIB-INFO**")))

(defn replace-tag [s]
  (string/replace s #"http://localhost.*?Chrome/.*" "http://localhost..."))

(defn transformer [console-output]
  (-> console-output
      replace-lib-info
      replace-tag))

(defn test-install-uninstall! []
  (with-feedback
    (runtime/available?)
    (runtime/available? :some-uknown-feature)

    (runtime/installed?)
    (runtime/installed? :repl)
    (runtime/installed? [:repl])
    (runtime/installed? :default)
    (runtime/installed? :all)

    (runtime/install!)

    (runtime/installed?)
    (runtime/installed? :repl)
    (runtime/installed? [:repl])
    (runtime/installed? :default)
    (runtime/installed? :all)

    (runtime/uninstall!)

    (runtime/installed?)
    (runtime/installed? :repl)
    (runtime/installed? [:repl])
    (runtime/installed? :default)
    (runtime/installed? :all))
  (scenario/feedback! "install/uninstall tests done"))

(defn test-prefs! []
  (let [default-prefs (runtime/get-prefs)]
    (with-feedback
      default-prefs
      (:agent-verbose (runtime/get-prefs))
      (:agent-verbose (runtime/set-pref! :agent-verbose true))
      (:agent-verbose (runtime/get-prefs))
      (runtime/set-prefs! {:some "pref"})
      (runtime/get-prefs)
      (:some (runtime/get-prefs))
      (:agent-verbose (runtime/get-prefs)))
    (runtime/set-prefs! default-prefs))
  (scenario/feedback! "prefs tests done"))

(defn test-runtime-tag! []
  (with-feedback
    (runtime/get-tag)
    (:runtime-tag (runtime/set-pref! :runtime-tag "my-runtime-tag"))
    (runtime/get-tag))
  (scenario/feedback! "runtime tags tests done"))

; ---------------------------------------------------------------------------------------------------------------------------

(scenario/capture-console-as-feedback!)
(scenario/register-feedback-transformer! transformer)
(scenario/ready!)

(go
  (flush-transcript!)
  (test-install-uninstall!)
  (flush-transcript!)
  (test-prefs!)
  (flush-transcript!)
  (test-runtime-tag!))