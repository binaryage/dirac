(ns dirac.shared.async
  (:require-macros [dirac.shared.async])
  (:require [cljs.core.async]))                                                                                               ; used by macros

; ---------------------------------------------------------------------------------------------------------------------------
; mainly just a stub namespace for macros

(defn set-timeout-marker! [o]
  (dirac.shared.async/gen-setup-timeout-marker o)
  true)
