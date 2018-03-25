(ns dirac.options.logging
  (:require [dirac.logging.toolkit :refer [gen-console-log]]))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(def enabled? true)
(def color "DarkCyan")

(defn gen-log [method env args]
  (if enabled?
    (gen-console-log method args {:env      env
                                  :bg-color color})))

; -- public api -------------------------------------------------------------------------------------------------------------

(defmacro log [& args]
  (gen-log "log" &env args))

(defmacro info [& args]
  (gen-log "info" &env args))

(defmacro error [& args]
  (gen-log "error" &env args))

(defmacro warn [& args]
  (gen-log "warn" &env args))
