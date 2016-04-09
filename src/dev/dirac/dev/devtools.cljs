(ns ^:figwheel-no-load dirac.dev.devtools
  (:require [devtools.core :as devtools]))

(devtools/install! [:custom-formatters :sanity-hints])
