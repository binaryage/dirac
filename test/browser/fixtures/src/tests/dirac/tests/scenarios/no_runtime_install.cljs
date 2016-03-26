(ns dirac.tests.scenarios.no-runtime-install
  (:require [dirac.fixtures.runtime :refer [init-runtime!]]))

(init-runtime! {:do-not-install-runtime true})