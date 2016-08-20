(ns dirac.tests.tasks.suite01.misc
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is testing]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools] :as a]
            [dirac.utils :as utils]))

(go-task
  (with-scenario "normal"))
