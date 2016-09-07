(ns dirac.runtime.preload
  (:require-macros [dirac.runtime.preload :refer [gen-config]])
  (:require [dirac.runtime :as dirac]))

; this namespace is intended to be included in cljs compiler :preloads
; overrides for default configuration can be specified in :external-config > :dirac.runtime/config
; see https://github.com/binaryage/dirac/blob/master/docs/configuration.md#dirac-runtime---page-specific-configuration

(def config (gen-config))

(dirac/set-prefs! (merge (dirac/get-prefs) config))

(if-not (dirac/get-pref :suppress-preload-install)
  (dirac/install!))
