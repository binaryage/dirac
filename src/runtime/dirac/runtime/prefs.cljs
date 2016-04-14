(ns dirac.runtime.prefs
  (:require-macros [dirac.runtime.prefs :refer [gen-static-prefs]]))

(def default-prefs
  {:dont-display-banner                         false
   :dirac-print-level                           1
   :dirac-print-length                          10
   :agent-host                                  "localhost"
   :agent-port                                  "8231"
   :agent-verbose                               false
   :agent-auto-reconnect                        true
   :agent-response-timeout                      5000
   :weasel-verbose                              false
   :weasel-auto-reconnect                       false
   :weasel-pre-eval-delay                       100
   :install-check-total-time-limit              5000
   :install-check-next-trial-waiting-time       500
   :install-check-eval-time-limit               300
   :context-availablity-total-time-limit        3000
   :context-availablity-next-trial-waiting-time 10
   :eval-time-limit                             10000
   :java-trace-header-style                     "color:red"})

(def static-prefs (gen-static-prefs))                                                                                         ; this config is comming from environment and system properties

(def current-prefs (atom (merge default-prefs static-prefs)))

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn get-prefs []
  @current-prefs)

(defn pref [key]
  (key (get-prefs)))

(defn set-prefs! [new-prefs]
  (reset! current-prefs new-prefs))

(defn set-pref! [key val]
  (swap! current-prefs assoc key val))

(defn merge-prefs! [m]
  (swap! current-prefs merge m))

(defn update-pref! [key f & args]
  (apply swap! current-prefs update key f args))