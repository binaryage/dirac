(ns dirac.test-lib.taxi
  (:require [clojure.tools.logging :as log]
            [dirac.settings :refer [get-taxi-implicit-wait get-taxi-page-load-timeout get-taxi-script-timeout]]
            [dirac.shared.travis :refer [with-travis-fold]]
            [dirac.test-lib.chrome-driver :refer [get-current-chrome-driver]])
  (:import (java.util.concurrent TimeUnit)))

(defn setup-taxi! []
  (let [driver (get-current-chrome-driver)]
    (assert driver)
    ; http://stackoverflow.com/questions/34790720/setting-of-pageload-timeout-for-clojure-webdriver
    (let [timeouts (.. driver manage timeouts)]
      (.pageLoadTimeout timeouts (get-taxi-page-load-timeout) TimeUnit/MILLISECONDS)
      (.setScriptTimeout timeouts (get-taxi-script-timeout) TimeUnit/MILLISECONDS)
      (.implicitlyWait timeouts (get-taxi-implicit-wait) TimeUnit/MILLISECONDS)
      (log/info "Taxi timeouts:" {:page-load     (get-taxi-page-load-timeout)
                                  :script        (get-taxi-script-timeout)
                                  :implicit-wait (get-taxi-implicit-wait)}))))

(defn with-taxi-setup [f]
  (with-travis-fold "Setup Taxi library" "setup-taxi"
    (setup-taxi!))
  (f))
