(ns dirac.tests.tasks.suite01.options
  (:require [cljs.test :refer-macros [is]]
            [clojure.string :as string]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]
            [dirac.shared.utils :as utils]))

(defn get-definitions [info-line]
  (if-let [m (re-find #"Backend API/[^/]+/(\d+)" info-line)]
    (utils/parse-int (second m))))

(defn get-registrations [info-line]
  (if-let [m (re-find #"Backend CSS/[^/]+/(\d+)" info-line)]
    (utils/parse-int (second m))))

(go-task
  (with-scenario "normal"
    (testing "user-specified url params should get propagated to DevTools frontends"
      (let [user-params "x=1&y=2"]
        (with-options {:user-frontend-url-params user-params}
          (with-devtools
            (is (string/includes? (<!* a/go-get-frontend-url-params) user-params))))))
    (testing "internal error presentation"
      (with-devtools
        (<!* a/go-switch-to-console-panel!)
        (<!* a/go-trigger-internal-error-as-error-log!)
        (is (= (count (<!* a/go-scrape :find-logs "a fake error log")) 1))
        (let [error-content (second (first (<!* a/go-scrape :find-logs-in-groups "a fake error log")))])))))
