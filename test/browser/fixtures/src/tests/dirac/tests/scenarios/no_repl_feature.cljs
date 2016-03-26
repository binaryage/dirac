(ns dirac.tests.scenarios.no-repl-feature
  (:require [dirac.fixtures.runtime :refer [init-runtime!]]))

(init-runtime! {:do-not-enable-repl true})