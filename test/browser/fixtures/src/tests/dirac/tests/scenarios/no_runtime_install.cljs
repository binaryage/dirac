(ns dirac.tests.scenarios.no-runtime-install
  (:require [dirac.automation.runtime :refer [init-runtime!]]))

(init-runtime! {:do-not-install-runtime true})