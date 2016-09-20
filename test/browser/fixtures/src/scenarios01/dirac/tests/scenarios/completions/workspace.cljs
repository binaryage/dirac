(ns dirac.tests.scenarios.completions.workspace
  (:require-macros [cljs.core.async.macros :as alias-cljs-core-async-macros :refer [go]]
                   [chromex.logging :refer [log warn]])
  (:require [cljs.core.async :as alias-cljs-core-async :refer [put!]]
            [dirac.settings :as alias-dirac-settings :refer-macros [get-dirac-devtools-window-top]]
            [goog.object :as gobj]
            [goog.string :as gstring :refer [isEmptyOrWhitespace]]))

(enable-console-print!)

(def sample-def "sample-def")
(defonce sample-defonce "sample-defonce")

(defn sample-defn [a b])
