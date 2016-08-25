(ns dirac.tests.tasks.suite01.misc
  (:require [cljs.core.async :refer [timeout]]
            [cljs.test :refer-macros [is]]
            [dirac.settings :refer-macros [seconds minutes]]
            [dirac.automation :refer-macros [<!* go-task with-scenario with-devtools with-options testing] :as a]
            [clojure.string :as string]))

(go-task
  (with-scenario "normal"
    (testing "user-specified url params should get propagated to DevTools frontends"
      (let [user-params "x=1&y=2"]
        (with-options {:user-frontend-url-params user-params}
          (with-devtools
            (is (string/includes? (<!* a/get-frontend-url-params) user-params))))))))
