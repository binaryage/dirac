(ns marion.content-script.logging
  (:require [dirac.logging.toolkit :refer [gen-console-log]]
            [environ.core :as environ]
            [clojure.string :as string]))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defonce enabled? true)
(defonce color "DarkRed")

(defn gen-log [method env args]
  (if enabled?
    (let [ns-name (name (:name (:ns env)))
          prefix (string/replace-first ns-name #"^dirac\." "")]
      (gen-console-log method args {; we don't compile marion with advanced optimizations for testing, instead we check env
                                    ; to detect if we are compiled for automated tests or not
                                    :raw      (some? (:dirac-test-browser environ/env))
                                    :prefix   prefix
                                    :bg-color color}))))

; -- public api -------------------------------------------------------------------------------------------------------------

(defmacro log [& args]
  (gen-log "log" &env args))

(defmacro info [& args]
  (gen-log "info" &env args))

(defmacro error [& args]
  (gen-log "error" &env args))

(defmacro warn [& args]
  (gen-log "warn" &env args))
