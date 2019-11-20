(ns dirac.home.chromium.scout-test
  (:require [clojure.test :refer :all]
            [matcher-combinators.test :refer :all]
            [matcher-combinators.matchers :as m]
            [dirac.home.chromium.scout :refer [parse-chrome-version-string]]))

(deftest parse-chrome-version-string-test
  (testing "parsing chrome executable version"
    (is (match? {:version "80.0.3968.0" :prefix "Google Chrome" :postfix "canary"}
                (parse-chrome-version-string "Google Chrome 80.0.3968.0 canary")))
    (is (match? {:version "80.0.3968.0" :prefix "Google Chrome" :postfix nil}
                (parse-chrome-version-string "Google Chrome 80.0.3968.0")))
    (is (match? {:version "80.0.3968.0" :prefix "Something" :postfix nil}
                (parse-chrome-version-string "Something 80.0.3968.0")))
    (is (match? {:version "80.0.3968.0" :prefix nil :postfix nil}
                (parse-chrome-version-string "80.0.3968.0")))
    (is (match? nil
                (parse-chrome-version-string "")))
    ))

(comment
  (run-tests))

