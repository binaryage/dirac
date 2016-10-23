(ns dirac.project)

; ideally this file should be generated from project.clj
; but with leiningen design it is non-trivial
; the problem is when dirac is used as a checkouts dependency

(def version "0.7.4")

(defmacro get-current-version []
  version)
