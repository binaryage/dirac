(ns dirac.automation.devtools
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [devtools.core :as devtools]
            [devtools.prefs :as devtools-prefs]))

(defn init-devtools! [& [config]]
  (devtools-prefs/set-pref! :dont-detect-custom-formatters true)
  (when-let [devtools-prefs (:devtools-prefs config)]                                                                         ; override devtools prefs
    (log "devtools override: set prefs " devtools-prefs)
    (devtools-prefs/merge-prefs! devtools-prefs))
  (if-not (:do-not-install-devtools config)                                                                                   ; override devtools features/installation
    (let [features-to-enable (cond-> []
                               (not (:do-not-enable-custom-formatters config)) (conj :formatters)
                               ; disable support for :hints for now
                               ; sync http request interferes with test transcripts
                               ; "JS.wrn> hints.cljs:55 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/."
                               ;(not (:do-not-enable-sanity-hints config)) (conj :hints)
                               (not (:do-not-enable-async config)) (conj :async))]
      (devtools/install! features-to-enable))
    (log "devtools override: do not install")))
