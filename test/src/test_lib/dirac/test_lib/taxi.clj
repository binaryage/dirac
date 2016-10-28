(ns dirac.test-lib.taxi
  (:require [dirac.settings :refer [get-taxi-page-load-timeout]]
            [dirac.test-lib.chrome-driver :refer [get-current-chrome-driver]])
  (:import (java.util.concurrent TimeUnit)))

(defn setup-taxi! []
  (let [driver (get-current-chrome-driver)]
    (assert driver)
    ; http://stackoverflow.com/questions/34790720/setting-of-pageload-timeout-for-clojure-webdriver
    (let [timeouts (.. driver manage timeouts)]
      (.pageLoadTimeout timeouts (get-taxi-page-load-timeout) TimeUnit/MILLISECONDS))))

(defn with-taxi-setup [f]
  (setup-taxi!)
  (f))
