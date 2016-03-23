(ns marion.content-script.logging)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(def enabled? false)

(defn prefix []
  "MARION CONTENT SCRIPT:")

(defmacro log [& args]
  (if enabled?
    `(do (.log js/console ~(prefix) ~@args) nil)))

(defmacro info [& args]
  (if enabled?
    `(do (.info js/console ~(prefix) ~@args) nil)))

(defmacro error [& args]
  (if enabled?
    `(do (.error js/console ~(prefix) ~@args) nil)))

(defmacro warn [& args]
  (if enabled?
    `(do (.warn js/console ~(prefix) ~@args) nil)))
