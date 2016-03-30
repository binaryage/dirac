(ns dirac.runtime.core
  (:require [dirac.project :refer [get-current-version]]
            [dirac.runtime.repl :as repl]
            [dirac.runtime.util :refer [display-banner-if-needed! report-unknown-features! install-feature! make-version-info
                                        make-lib-info]]))

(def known-features [:repl])
(def features-to-install-by-default [:repl])

; -- CORE API ---------------------------------------------------------------------------------------------------------------

(defn is-feature-available? [feature]
  (case feature
    :repl (repl/available?)))

(defn install! [features-to-install]
  (let [lib-info (make-lib-info (get-current-version))]
    (report-unknown-features! features-to-install known-features lib-info)
    (display-banner-if-needed! features-to-install known-features lib-info)
    (install-feature! :repl features-to-install is-feature-available? repl/install!)))

(defn uninstall! []
  (repl/uninstall!))