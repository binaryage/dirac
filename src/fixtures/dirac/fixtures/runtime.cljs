(ns dirac.fixtures.runtime
  (:require-macros [dirac.settings :refer [get-test-dirac-agent-port]])
  (:require [chromex.logging :refer-macros [log warn error info]]
            [dirac.runtime :as runtime]
            [dirac.runtime.prefs :as runtime-prefs]))

(defn init-runtime! [& [config]]
  (runtime/set-pref! :agent-port (get-test-dirac-agent-port))
  ; override runtime prefs
  (when-let [runtime-prefs (:runtime-prefs config)]
    (warn "dirac runtime override: set prefs " runtime-prefs)
    (runtime-prefs/merge-prefs! runtime-prefs))
  ; override devtools features/installation
  (if-not (:do-not-install-runtime config)
    (do
      (when (:do-not-enable-repl config)
        (warn "dirac runtime override: do not enable :repl feature")
        (runtime/disable-features! :repl))
      (runtime/install!))
    (warn "dirac runtime override: do not install")))