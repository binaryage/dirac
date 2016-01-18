(ns dirac.tests
  (:require [clojure.test :refer :all]
            [dirac.agent-test]))

; this is the default dirac test runner

(def default-test-namespaces
  ['dirac.agent-test])

(apply run-tests default-test-namespaces)