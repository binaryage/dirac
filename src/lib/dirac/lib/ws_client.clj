(ns dirac.lib.ws-client)

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defn prefix [client]
  `(str (get-in ~client [:options :name]) ":"))

(defmacro log [client & args]
  `(do (.log js/console ~(prefix client) ~@args) nil))

(defmacro info [client & args]
  `(do (.info js/console ~(prefix client) ~@args) nil))

(defmacro error [client & args]
  `(do (.error js/console ~(prefix client) ~@args) nil))

(defmacro warn [client & args]
  `(do (.warn js/console ~(prefix client) ~@args) nil))
