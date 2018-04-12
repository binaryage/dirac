(ns dirac.tests.tasks.suite01.options
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]
            [clojure.string :as string]
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
    (testing "use backend-supported api and css"
      (with-options {:use-backend-supported-api true
                     :use-backend-supported-css true}
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-trigger-internal-error-as-error-log!)
          (is (= (count (<!* a/go-scrape :find-logs "a fake error log")) 1))
          (let [error-content (second (first (<!* a/go-scrape :find-logs-in-groups "a fake error log")))
                info-line (first (utils/lines error-content))]
            (is (string/includes? info-line "Backend API/external"))
            (is (string/includes? info-line "Backend CSS/external"))
            (is (> (get-registrations info-line) 400))
            (is (> (get-definitions info-line) 400))))))
    (testing "use baked-in api and css"
      (with-options {:use-backend-supported-api false
                     :use-backend-supported-css false}
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-trigger-internal-error-as-error-log!)
          (is (= (count (<!* a/go-scrape :find-logs "a fake error log")) 1))
          (let [error-content (second (first (<!* a/go-scrape :find-logs-in-groups "a fake error log")))
                info-line (first (utils/lines error-content))]
            (is (string/includes? info-line "Backend API/internal"))
            (is (string/includes? info-line "Backend CSS/internal"))
            (is (> (get-registrations info-line) 400))
            (is (> (get-definitions info-line) 400))))))))
