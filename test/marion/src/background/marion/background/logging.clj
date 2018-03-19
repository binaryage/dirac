(ns marion.background.logging
  (:require [dirac.logging.toolkit :refer [gen-console-log]]
            [clojure.string :as string]))

; ---------------------------------------------------------------------------------------------------------------------------
; logging - these need to be macros to preserve source location for devtools

(defonce enabled? true)
(defonce color "IndianRed")

(defn gen-log [method env args]
  (if enabled?
    (let [ns-name (name (:name (:ns env)))
          prefix (string/replace-first ns-name #"^dirac\." "")]
      (gen-console-log method args {:prefix   prefix
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
