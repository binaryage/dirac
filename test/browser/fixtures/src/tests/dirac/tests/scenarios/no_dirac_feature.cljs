(ns dirac.tests.scenarios.no-dirac-feature
  (:require [dirac.fixtures.devtools :refer [init-devtools!]]))

(init-devtools! {:do-not-enable-dirac true})