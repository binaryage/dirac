(ns dirac.implant.helpers
  (:require [oops.core :refer [oget ocall oapply gget gcall gcall!]]
            [chromex.logging :refer-macros [log warn error group group-end]]))

(defn get-url-params []
  (gget "location.search"))

(defn get-console-view []
  (if-let [console-view-class (gget "?Console.?ConsoleView")]
    (if-let [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain Console.ConsoleView from DevTools" nil))))

(defn get-inspector-view []
  (if-let [inspector-view (gget "?UI.?inspectorView")]
    inspector-view
    (throw (ex-info "Unable to obtain UI.inspectorView" nil))))

(defn resolved-promise [value]
  (gcall "Promise.resolve" value))

(defn warm-up-namespace-cache! []
  (gcall! "dirac.extractNamespacesAsync"))

(defn throw-internal-error! []
  (into nil :keyword))
