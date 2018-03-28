(ns dirac.tests.tasks.suite02.clean-urls
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.shared.utils :refer [line-count]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

; WARNING: these tests rely on figwheel's "side effect" of adding "rel=<timestamp>" into cljs url params

(go-task
  (with-scenario "breakpoint"
    (testing "enabled :clean-urls feature"
      (with-devtools
        (<!* a/go-trigger! :pause-on-breakpoint)
        (<!* a/go-wait-for-devtools-match "setCurrentPanel: sources")
        (<!* a/go-scrape! :callstack-pane-locations)
        (<!* a/go-wait-for-match "* core.cljs:"))))
  (with-scenario "breakpoint"
    (testing "disabled :clean-urls feature"
      (with-options {:clean-urls false}
        (with-devtools
          (<!* a/go-trigger! :pause-on-breakpoint)
          (<!* a/go-wait-for-devtools-match "setCurrentPanel: sources")
          (<!* a/go-scrape! :callstack-pane-locations)
          (<!* a/go-wait-for-match "* core.cljs?rel="))))))
