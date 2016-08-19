(ns dirac.tests.tasks.suite02.clean-urls
  (:require [cljs.core.async]
            [cljs.test :refer-macros [is testing]]
            [dirac.utils :refer [line-count]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options] :as a]))

; WARNING: these tests rely on figwheel's "side effect" of adding "rel=<timestamp>" into cljs url params

(go-task
  (with-scenario "breakpoint"
    (testing "enabled :clean-urls feature"
      (with-devtools
        (<!* a/trigger! :pause-on-breakpoint)
        (<!* a/wait-for-devtools-match "setCurrentPanel: sources")
        (is (= (line-count (<!* a/scrape! :callstack-pane-locations)) 8))
        (<!* a/wait-for-match "* core.cljs:"))))
  (with-scenario "breakpoint"
    (testing "disabled :clean-urls feature"
      (with-options {:clean-urls false}
        (with-devtools
          (<!* a/trigger! :pause-on-breakpoint)
          (<!* a/wait-for-devtools-match "setCurrentPanel: sources")
          (is (= (line-count (<!* a/scrape! :callstack-pane-locations)) 8))
          (<!* a/wait-for-match "* core.cljs?rel="))))))
