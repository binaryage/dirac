(ns dirac.tests.scenarios.runtime-api
  (:require-macros [dirac.shared.async :refer [go]])
  (:require [dirac.shared.async :refer [put! <! go-channel go-wait alts! close!]]
            [chromex.logging :refer-macros [log]]
            [dirac.automation.runtime :refer [init-runtime!]]
            [dirac.automation.scenario :as scenario :refer-macros [with-feedback]]
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
    (runtime/available? :an-unknown-feature)

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
  (scenario/go-post-feedback! "install/uninstall tests done"))

(defn test-prefs! []
  (let [default-prefs (runtime/get-prefs)]
    (with-feedback
      (sort (keys default-prefs))
      (:agent-verbose (runtime/get-prefs))
      (:agent-verbose (runtime/set-pref! :agent-verbose true))
      (:agent-verbose (runtime/get-prefs))
      (runtime/set-prefs! {:some "pref"})
      (runtime/get-prefs)
      (:some (runtime/get-prefs))
      (:agent-verbose (runtime/get-prefs)))
    (runtime/set-prefs! default-prefs))
  (scenario/go-post-feedback! "prefs tests done"))

(defn test-runtime-tag! []
  (with-feedback
    (runtime/get-tag)
    (:runtime-tag (runtime/set-pref! :runtime-tag "my-runtime-tag"))
    (runtime/get-tag))
  (scenario/go-post-feedback! "runtime tags tests done"))

; ---------------------------------------------------------------------------------------------------------------------------

(defn run-tests! []
  (test-install-uninstall!)
  (test-prefs!)
  (test-runtime-tag!))

(scenario/register-feedback-transformer! transformer)
(scenario/register-trigger! :run-tests run-tests!)
(scenario/capture-console-as-feedback!)
(scenario/go-ready!)
