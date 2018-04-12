(ns marion.content-script.logging
  (:require [dirac.logging.toolkit :refer [gen-console-log]]
            [dirac.shared.utils :refer [dirac-test-mode?]]))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(def enabled? true)
(def color "purple")

(defn gen-log [method env args]
  (if enabled?
    (gen-console-log method args {; we don't compile marion with advanced optimizations for testing, instead we check env
                                  ; to detect if we are compiled for automated tests or not
                                  :raw      (dirac-test-mode?)
                                  :env      env
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
