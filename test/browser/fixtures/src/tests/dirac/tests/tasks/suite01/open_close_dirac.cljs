(ns dirac.tests.tasks.suite01.open-close-dirac
  (:require [cljs.core.async]
            [dirac.automation :refer-macros [<!* go-task] :as a]))

(go-task
  (<!* a/open-tab-with-scenario! "normal")
  (<!* a/open-dirac-devtools!)
  (<!* a/close-dirac-devtools!)
  (<!* a/wait-for-devtools-close))