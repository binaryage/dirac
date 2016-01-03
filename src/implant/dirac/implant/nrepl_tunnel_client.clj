(ns dirac.implant.nrepl-tunnel-client)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defn prefix []
  "nREPL tunnel:")

(defmacro log [& args]
  `(do (.log js/console ~(prefix) ~@args) nil))

(defmacro info [& args]
  `(do (.info js/console ~(prefix) ~@args) nil))

(defmacro error [& args]
  `(do (.error js/console ~(prefix) ~@args) nil))

(defmacro warn [& args]
  `(do (.warn js/console ~(prefix) ~@args) nil))
