(ns dirac.tests.scenarios.no-repl-feature
  (:require [dirac.automation.runtime :refer [init-runtime!]]))

(init-runtime! {:do-not-enable-repl true})