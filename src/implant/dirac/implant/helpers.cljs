(ns dirac.implant.helpers
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]))

(defn get-url-params []
  (oget js/window "location" "search"))

(defn get-query-param [name]
  (if-let [runtime (oget js/window "Runtime")]
    (ocall runtime "queryParam" name)
    (throw (ex-info "Unable to obtain window.Runtime from DevTools" nil))))

(defn get-devtools-id* []
  (or (js/parseInt (get-query-param "devtools_id") 10) 0))

(def get-devtools-id (memoize get-devtools-id*))

(defn should-automate?* []
  (= (get-query-param "dirac_automate") "1"))

(def should-automate? (memoize should-automate?*))

(defn should-mock-old-extension-version?* []
  (= (get-query-param "mock_old_extension_version") "1"))

(def should-mock-old-extension-version? (memoize should-mock-old-extension-version?*))

(defn should-mock-future-extension-version?* []
  (= (get-query-param "mock_future_extension_version") "1"))

(def should-mock-future-extension-version? (memoize should-mock-future-extension-version?*))

(defn get-console-view []
  (if-let [console-view-class (oget js/window "WebInspector" "ConsoleView")]
    (if-let [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain WebInspector.ConsoleView from DevTools" nil))))

(defn get-inspector-view []
  (if-let [inspector-view (oget js/window "WebInspector" "inspectorView")]
    inspector-view
    (throw (ex-info "Unable to obtain WebInspector.inspectorView" nil))))

(defn resolved-promise [value]
  (ocall (oget js/window "Promise") "resolve" value))

(defn warm-up-namespace-cache! []
  (ocall (oget js/window "dirac") "extractNamespacesAsync"))

(defn throw-internal-error! []
  (into nil :keyword))
