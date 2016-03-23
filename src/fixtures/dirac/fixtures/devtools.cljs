(ns dirac.fixtures.devtools
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.settings :refer [get-test-dirac-agent-port]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [devtools.core :as devtools]
            [devtools.prefs :as devtools-prefs]))

(defn init-devtools! [& [config]]
  (devtools/set-pref! :agent-port (get-test-dirac-agent-port))
  ; override devtools prefs
  (when-let [devtools-prefs (:devtools-prefs config)]
    (log "devtools override: set prefs " devtools-prefs)
    (devtools-prefs/merge-prefs! devtools-prefs))
  ; override devtools features/installation
  (if-not (:do-not-install-devtools config)
    (do
      (if-not (:do-not-enable-dirac config)
        (devtools/enable-feature! :dirac)
        (log "devtools override: do not enable :dirac feature"))
      (if-not (:do-not-enabled-sanity-hints config)
        (devtools/enable-feature! :sanity-hints)
        (log "devtools override: do not enable :sanity-hints feature"))
      (devtools/install!))
    (log "devtools override: do not install")))