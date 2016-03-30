(ns dirac.options.logging)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(def enabled? true)

(defn prefix []
  ["%cdirac%coptions"
   "background-color:green;color:white;font-weight:bold;padding:0px 3px;border-radius:2px 0px 0px 2px;"
   "background-color:purple;color:white;font-weight:bold;padding:0px 3px;border-radius:0px 2px 2px 0px;"])

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