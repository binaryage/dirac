(ns dirac.home
  (:require [dirac.home.locations :as locations]))

(def get-home-dir-path locations/get-home-dir-path)

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (get-home-dir-path)
  )
