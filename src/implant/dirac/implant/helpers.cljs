(ns dirac.implant.helpers
  (:require [dirac.implant.logging :refer [error log warn]]
            [oops.core :refer [gcall gcall! ocall! gget oapply ocall oget]]))

(defn get-dirac-angel []
  (or (gget "window.diracAngel")
      (throw (ex-info "Unable to obtain diracAngel" nil))))

(defn get-url-params []
  (gget "location.search"))

(defn get-console-view []
  (if-some [console-view-class (gget "?Console.?ConsoleView")]
    (if-some [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain Console.ConsoleView from DevTools" nil))))

(defn get-inspector-view []
  (or (gget "?UI.?inspectorView")
      (throw (ex-info "Unable to obtain UI.inspectorView" nil))))

(defn resolved-promise [value]
  (gcall "Promise.resolve" value))

(defn warm-up-namespace-cache! []
  (ocall! (get-dirac-angel) "extractNamespacesAsync"))

(defn throw-internal-error-for-testing! []
  (into nil :keyword))

(defn get-sources-panel []
  (ocall (get-dirac-angel) "getPanel" "sources"))

(defn get-callstack-pane [sources-panel]
  (oget sources-panel "_callstackPane"))

(defn update-callstack-pane! []
  (when-some [sources-panel (get-sources-panel)]
    (ocall (get-callstack-pane sources-panel) "_update")))
