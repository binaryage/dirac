(ns dirac.implant.options
  (:require [dirac.implant.logging :refer [error log warn]]
            [oops.core :refer [gcall gget oapply oget]]))

(defn get-query-param [name]
  (gcall "Root.Runtime.queryParam" name))

; -- url param access -------------------------------------------------------------------------------------------------------

(defn get-devtools-id* []
  (or (js/parseInt (get-query-param "devtools_id") 10) 0))

(defn should-automate?* []
  (= (get-query-param "dirac_automate") "1"))

(defn should-mock-old-extension-version?* []
  (= (get-query-param "mock_old_extension_version") "1"))

(defn should-mock-future-extension-version?* []
  (= (get-query-param "mock_future_extension_version") "1"))

(defn should-disable-reporter?* []
  (= (get-query-param "disable_reporter") "1"))

; -- memoized API -----------------------------------------------------------------------------------------------------------

(def get-devtools-id (memoize get-devtools-id*))
(def should-automate? (memoize should-automate?*))
(def should-mock-old-extension-version? (memoize should-mock-old-extension-version?*))
(def should-mock-future-extension-version? (memoize should-mock-future-extension-version?*))
(def should-disable-reporter? (memoize should-disable-reporter?*))
