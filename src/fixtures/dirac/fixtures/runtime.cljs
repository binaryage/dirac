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
    (let [features-to-enable (cond-> []
                                     (not (:do-not-enable-repl config)) (conj :repl))]
      (runtime/install! features-to-enable))
    (warn "dirac runtime override: do not install")))