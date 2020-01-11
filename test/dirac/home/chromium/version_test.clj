(ns dirac.home.chromium.version-test
  (:require [clojure.test :refer :all]
            [matcher-combinators.test :refer :all]
            [matcher-combinators.matchers :as m]
            [dirac.home.chromium.version :refer [tokenize-version compare-versions]]))

(deftest tokenize-version-test
  (testing "version tokenization"
    (is (= [80 0 3968 0] (tokenize-version "80.0.3968.0")))
    (is (= [80 3968 0] (tokenize-version "fff8xxx0aa..3968.-.")))))

(deftest compare-versions-test
  (testing "version comparison"
    ; taken from https://stackoverflow.com/a/8708430/84283
    (is (= 1 (compare-versions "1" "0.9")))
    (is (= 1 (compare-versions "1" "0.9")))
    (is (= 1 (compare-versions "0.0.0.2" "0.0.0.1")))
    (is (= 1 (compare-versions "1.0" "0.9")))
    (is (= 1 (compare-versions "2.0.1" "2.0.0")))
    (is (= 1 (compare-versions "2.0.1" "2.0")))
    (is (= 1 (compare-versions "2.0.1" "2")))
    (is (= 1 (compare-versions "0.9.1" "0.9.0")))
    (is (= 1 (compare-versions "0.9.2" "0.9.1")))
    (is (= 1 (compare-versions "0.9.11" "0.9.2")))
    (is (= 1 (compare-versions "0.9.12" "0.9.11")))
    (is (= 1 (compare-versions "0.10" "0.9")))
    (is (= 0 (compare-versions "0.10" "0.10")))
    (is (= -1 (compare-versions "2.10" "2.10.1")))
    (is (= -1 (compare-versions "0.0.0.2" "0.1")))
    (is (= 1 (compare-versions "1.0" "0.9.2")))
    (is (= 1 (compare-versions "1.10" "1.6")))
    (is (= 0 (compare-versions "1.10" "1.10.0.0.0.0")))
    (is (= 1 (compare-versions "1.10.0.0.0.1" "1.10")))
    (is (= 0 (compare-versions "1.10.0.0.0.0" "1.10")))
    (is (= 1 (compare-versions "1.10.0.0.0.1" "1.10")))))

(comment
  (run-tests))

