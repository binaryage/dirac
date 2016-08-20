(ns dirac.tests.tasks.suite01.error-feedback
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools] :as a]
            [dirac.utils :as utils]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (testing "unhandled DevTools exceptions should be presented in target console as Internal Dirac Error"
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger-internal-error!)
        (let [error-content (<!* a/scrape :last-log-item-content "error")
              first-line (utils/extract-first-line error-content)
              second-line (utils/extract-line error-content 1)]
          (is (= first-line "Internal Dirac Error: DevTools code has thrown an unhandled exception"))
          (is (= second-line "Error: :keyword is not ISeqable"))
          (is (> (utils/line-count error-content) 4))))                                                                       ; assume it contains some stack trace
      (testing "async unhandled DevTools exceptions in promises should be presented in target console as Internal Dirac Error"
        (<!* a/trigger-internal-error-in-promise!)
        (let [error-content (<!* a/scrape :last-log-item-content "error")
              first-line (utils/extract-first-line error-content)
              second-line (utils/extract-line error-content 1)]
          (is (= first-line "Internal Dirac Error: DevTools code has thrown an unhandled rejection (in promise)"))
          (is (= second-line "Error: fake async error in promise"))
          (is (> (utils/line-count error-content) 4))))                                                                       ; assume it contains some stack trace
      (testing "DevTools console.error logs should be presented in target console as Internal Dirac Error"
        ; TBD
        ))))
