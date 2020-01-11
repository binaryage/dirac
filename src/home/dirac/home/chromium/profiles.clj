(ns dirac.home.chromium.profiles
  (:require [dirac.home.locations :as locations]))

(def get-chromium-profiles-dir-path locations/get-chromium-profiles-dir-path)

(defn get-chromium-profile-dir-path [name]
  (locations/canonical-path (get-chromium-profiles-dir-path) name))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (get-chromium-profiles-dir-path)
  (get-chromium-profile-dir-path "test")
  )
