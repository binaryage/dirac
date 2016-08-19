(ns dirac.runtime.preload
  (:require-macros [dirac.runtime.preload :refer [gen-config]])
  (:require [dirac.runtime.prefs :as prefs]
            [dirac.runtime.core :as core]))

; this namespace is intended to be included in cljs compiler :preloads
; overrides for default configuration can be specified in :external-config > :dirac.runtime/config

(def config (gen-config))

(prefs/merge-prefs! config)

(if-not (prefs/pref :suppress-preload-install)
  (core/install!))
