(ns dirac.tests.tasks.suite01.error-feedback
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]))

(go-task
  (with-scenario "normal"
    (with-devtools
      (<!* a/go-switch-to-console-panel!)
      #_(testing "unhandled DevTools exceptions should be presented in target console as Internal Dirac Error"
        (<!* a/go-trigger-internal-error!)
        (let [error-header (<!* a/go-scrape :last-log-item-content "info")]
          (is (= error-header "Internal Dirac Error Error: :keyword is not ISeqable"))))
      (testing "async unhandled DevTools exceptions in promises should be presented in target console as Internal Dirac Error"
        (<!* a/go-trigger-internal-error-in-promise!)
        (let [error-header (<!* a/go-scrape :last-log-item-content "info")]
          (is (= error-header "Internal Dirac Error Error: fake async error in promise"))))
      (testing "DevTools console.error logs should be presented in target console as Internal Dirac Error"
        (<!* a/go-trigger-internal-error-as-error-log!)
        (let [error-header (<!* a/go-scrape :last-log-item-content "info")]
          (is (= error-header "Internal Dirac Error a fake error log")))))
    (testing "allow disabling error reporter via an url param"
      (with-options {:user-frontend-url-params "disable_reporter=1"}
        (with-devtools
          (<!* a/go-switch-to-console-panel!)
          (<!* a/go-trigger-internal-error!)
          (<!* a/go-trigger-internal-error-in-promise!)
          (<!* a/go-trigger-internal-error-as-error-log!)
          ; no existing log item should contain "Internal Dirac Error"
          (is (zero? (<!* a/go-count-internal-dirac-errors))))))))
