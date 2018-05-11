(ns dirac.tests.tasks.suite02.clean-urls
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]
            [dirac.shared.utils :refer [line-count]]))

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
