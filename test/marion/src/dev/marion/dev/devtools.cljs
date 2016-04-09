(ns ^:figwheel-no-load marion.dev.devtools
  (:require [devtools.core :as devtools]))

(devtools/install! [:custom-formatters :sanity-hints])
