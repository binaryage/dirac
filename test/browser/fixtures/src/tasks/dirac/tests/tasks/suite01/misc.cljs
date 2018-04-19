(ns dirac.tests.tasks.suite01.misc
  (:require [cljs.test :refer-macros [is]]
            [dirac.automation :refer-macros [<!* go-task testing with-devtools with-options with-scenario] :as a]
            [dirac.settings :refer [minutes seconds]]
            [dirac.shared.async]))

(go-task
  (with-scenario "normal"))
