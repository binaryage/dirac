(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [clj-webdriver.taxi :refer :all]))

(defn start-browser []
  (set-driver! {:browser :chrome}))

(defn stop-browser []
  (quit))

(defn with-browser [t]
  (start-browser)
  (t)
  (stop-browser))

(use-fixtures :once with-browser)

(deftest homepage-greeting
  (to "http://localhost:7000")
  (is (= (text "body") "Hello World")))