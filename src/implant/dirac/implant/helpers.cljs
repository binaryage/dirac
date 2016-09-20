(ns dirac.implant.helpers
  (:require [oops.core :refer [oget ocall oapply]]
            [chromex.logging :refer-macros [log warn error group group-end]]))

(defn get-url-params []
  (oget js/window "location.search"))

(defn get-console-view []
  (if-let [console-view-class (oget js/window "?WebInspector.?ConsoleView")]
    (if-let [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain WebInspector.ConsoleView from DevTools" nil))))

(defn get-inspector-view []
  (if-let [inspector-view (oget js/window "?WebInspector.?inspectorView")]
    inspector-view
    (throw (ex-info "Unable to obtain WebInspector.inspectorView" nil))))

(defn resolved-promise [value]
  (ocall (oget js/window "Promise") "resolve" value))

(defn warm-up-namespace-cache! []
  (ocall (oget js/window "dirac") "extractNamespacesAsync"))

(defn throw-internal-error! []
  (into nil :keyword))
