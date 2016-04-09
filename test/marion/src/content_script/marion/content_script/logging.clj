(ns marion.content-script.logging)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defonce enabled? true)

(defn prefix []
  ["%cmarion%ccontent script"
   "background-color:purple;color:white;font-weight:bold;padding:0px 3px;border-radius:2px 0px 0px 2px;"
   "background-color:green;color:white;font-weight:bold;padding:0px 3px;border-radius:0px 2px 2px 0px;"])

(defmacro log [& args]
  (if enabled?
    `(do (.log js/console ~@(prefix) ~@args) nil)))

(defmacro info [& args]
  (if enabled?
    `(do (.info js/console ~@(prefix) ~@args) nil)))

(defmacro error [& args]
  (if enabled?
    `(do (.error js/console ~@(prefix) ~@args) nil)))

(defmacro warn [& args]
  (if enabled?
    `(do (.warn js/console ~@(prefix) ~@args) nil)))
