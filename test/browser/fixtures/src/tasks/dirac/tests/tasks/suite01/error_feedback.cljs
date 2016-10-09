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
        (let [error-header (<!* a/scrape :last-log-item-content "log")]
          (is (= error-header "Internal Dirac Error Error: :keyword is not ISeqable"))))
      (testing "async unhandled DevTools exceptions in promises should be presented in target console as Internal Dirac Error"
        (<!* a/trigger-internal-error-in-promise!)
        (let [error-header (<!* a/scrape :last-log-item-content "log")]
          (is (= error-header "Internal Dirac Error Error: fake async error in promise"))))
      (testing "DevTools console.error logs should be presented in target console as Internal Dirac Error"
        (<!* a/trigger-internal-error-as-error-log!)
        (let [error-header (<!* a/scrape :last-log-item-content "log")]
          (is (= error-header "Internal Dirac Error a fake error log")))))
    (testing "allow disabling error reporter via an url param"
      (with-options {:user-frontend-url-params "disable_reporter=1"}
        (with-devtools
          (<!* a/switch-to-console-panel!)
          (<!* a/trigger-internal-error!)
          (<!* a/trigger-internal-error-in-promise!)
          (<!* a/trigger-internal-error-as-error-log!)
          ; no existing log item should contain "Internal Dirac Error"
          (is (zero? (count (<!* a/scrape :find-logs "Dirac Internal Error")))))))))
