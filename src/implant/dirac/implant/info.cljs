(ns dirac.implant.info
  (:require [clojure.string :as string]
            [dirac.implant.logging :refer [error log warn]]
            [dirac.implant.version :refer [get-version]]
            [dirac.runtime.util :refer [get-browser-platform-info get-browser-version-info]]                                  ; TODO: we should not depend on runtime here
            [oops.core :refer [gget oapply ocall oget oset!]]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn make-chrome-info [tag rev]
  (str tag "@" (.substring rev 0 7)))

; -- versions ---------------------------------------------------------------------------------------------------------------

(defn get-version-info []
  (str "Dirac v" (get-version)))

; -- public -----------------------------------------------------------------------------------------------------------------

(defn get-info-line []
  (let [parts [(get-version-info)
               (get-browser-version-info)
               (get-browser-platform-info)]]
    (string/join ", " parts)))
