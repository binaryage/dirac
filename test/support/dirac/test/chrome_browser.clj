(ns dirac.test.chrome-browser
  (:require [clj-webdriver.taxi :refer :all]
            [clj-webdriver.driver :refer [init-driver]])
  (:import (org.openqa.selenium.chrome ChromeDriver ChromeOptions)
           (org.openqa.selenium.remote DesiredCapabilities)))

(defn start-browser []
  (let [caps (DesiredCapabilities/chrome)
        options (ChromeOptions.)]
    ;(.setBinary options "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary")
    (.setCapability caps ChromeOptions/CAPABILITY options)
    (let [chrome-driver (ChromeDriver. caps)
          driver (init-driver chrome-driver)]
      (set-driver! driver))))

(defn stop-browser []
  (quit))

(defn with-chrome-browser [f]
  (start-browser)
  (f)
  (stop-browser))