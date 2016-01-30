(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.chrome-browser :refer [with-chrome-browser]]
            [clj-webdriver.taxi :refer :all]))

(use-fixtures :once with-chrome-browser with-fixtures-web-server)

(deftest fixtures-web-server-check
  (to "http://localhost:9090")
  (is (= (text "body") "fixtures web-server ready")))

(deftest p01
  (to "http://localhost:9090/p01/resources/index.html")
  (is (= (text "body") "P01")))