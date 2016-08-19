(ns dirac.tests.tasks.suite01.misc
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools] :as a]
            [dirac.utils :as utils]))

(go-task
  (with-scenario "normal"
    (testing "unhandled DevTools exceptions should be presented in target console as Internal Dirac Error"
      (with-devtools
        (<!* a/switch-to-console-panel!)
        (<!* a/trigger-internal-error! 200)
        (<! (timeout 500))
        (let [error-content (<!* a/scrape :last-log-item-content "error")
              first-line (utils/extract-first-line error-content)
              second-line (utils/extract-line error-content 1)]
          (is (= first-line "Internal Dirac Error: DevTools code has thrown an unhandled exception"))
          (is (= second-line "Error: :nonsense is not ISeqable"))
          ; assume it contains some stack trace
          (is (> (utils/line-count error-content) 4)))))))
