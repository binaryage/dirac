(ns dirac.browser-tests
  (:require [clojure.test :refer :all]
            [dirac.test.fixtures-web-server :refer [with-fixtures-web-server]]
            [dirac.test.chrome-browser :refer [with-chrome-browser disconnect-browser! reconnect-browser!]]
            [clj-webdriver.taxi :refer :all]))

(use-fixtures :once with-chrome-browser with-fixtures-web-server)

(deftest fixtures-web-server-check
  (to "http://localhost:9090")
  (is (= (text "body") "fixtures web-server ready")))

(def expected-p01-transcript
  "exec{:command :fire-synthetic-chrome-event, :chrome-event [:chromex.ext.commands/on-command [\"open-dirac-devtools\"]]}")

(deftest p01
  (to "http://localhost:9090/p01/resources/index.html")
  (disconnect-browser!)
  (reconnect-browser!)
  (is (= (text "body") expected-p01-transcript)))