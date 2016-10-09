(ns dirac.runtime.deps
  (:require [cljs.reader]))                                                                                                   ; needed for present-server-side-result!

; here we specify dependencies potentially needed by code sent for evaluation
; see dirac.implant.eval, dirac.nrepl.eval and dirac.nrepl.special
