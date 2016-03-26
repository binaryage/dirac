(ns dirac.runtime.prefs)

(def default-prefs
  {:install-repl        true
   :dont-display-banner false
   :dirac-print-level   1
   :dirac-print-length  10})

(def current-prefs (atom default-prefs))

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