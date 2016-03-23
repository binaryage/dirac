(ns marion.background.logging)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(def enabled? true)

(defn prefix []
  "MARION BACKGROUND PAGE:")

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
