(ns dirac.tests.tasks.suite01.error-feedback
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]
            [dirac.utils :as utils]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (testing "unhandled DevTools exceptions should be presented in target console as Internal Dirac Error"
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger-internal-error!)
        (is (= (<!* a/scrape :count-log-items "error") 1))
        (let [error-content (utils/lines (<!* a/scrape :last-log-item-content "error"))
              first-line (first error-content)
              third-line (nth error-content 2 nil)]
          (is (= first-line "Internal Dirac Error: DevTools code has thrown an unhandled exception"))
          (is (= third-line "Error: :keyword is not ISeqable"))
          (is (pos? (count (drop 3 error-content))))))                                                                        ; assume it contains some stack trace
      (testing "async unhandled DevTools exceptions in promises should be presented in target console as Internal Dirac Error"
        (<!* a/trigger-internal-error-in-promise!)
        (is (= (<!* a/scrape :count-log-items "error") 2))
        (let [error-content (utils/lines (<!* a/scrape :last-log-item-content "error"))
              first-line (first error-content)
              third-line (nth error-content 2 nil)]
          (is (= first-line "Internal Dirac Error: DevTools code has thrown an unhandled rejection (in promise)"))
          (is (= third-line "Error: fake async error in promise"))
          (is (pos? (count (drop 3 error-content))))))                                                                        ; assume it contains some stack trace
      (testing "DevTools console.error logs should be presented in target console as Internal Dirac Error"
        (<!* a/trigger-internal-error-as-error-log!)
        (is (= (<!* a/scrape :count-log-items "error") 3))
        (let [error-content (utils/lines (<!* a/scrape :last-log-item-content "error"))
              first-line (first error-content)
              third-line (nth error-content 2 nil)]
          (is (= first-line "Internal Dirac Error: an error was logged into the internal DevTools console"))
          (is (= third-line "(\"a fake error log\" 1 2 3)"))
          (is (zero? (count (drop 3 error-content)))))))
    (testing "allow disabling error reporter via an url param"
      (with-options {:user-frontend-url-params "disable_reporter=1"}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/trigger-internal-error!)
          (<!* a/trigger-internal-error-in-promise!)
          (<!* a/trigger-internal-error-as-error-log!)
          (is (= (<!* a/scrape :count-log-items "error") 0)))))))
