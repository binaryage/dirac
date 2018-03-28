(ns dirac.tests.tasks.suite01.misc
  (:require [dirac.shared.async]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]))

(go-task
  (with-scenario "normal"))
