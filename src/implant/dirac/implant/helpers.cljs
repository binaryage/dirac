(ns dirac.implant.helpers
  (:require [oops.core :refer [oget ocall oapply gget gcall gcall!]]
            [dirac.implant.logging :refer [log warn error]]))

(defn get-url-params []
  (gget "location.search"))

(defn get-console-view []
  (if-some [console-view-class (gget "?Console.?ConsoleView")]
    (if-some [console-view (ocall console-view-class "instance")]
      console-view
      (throw (ex-info "Unable to obtain ConsoleView instance from DevTools" nil)))
    (throw (ex-info "Unable to obtain Console.ConsoleView from DevTools" nil))))

(defn get-dirac-api []
  (or (gget "dirac")
      (throw (ex-info "Unable to obtain dirac" nil))))

(defn get-inspector-view []
  (or (gget "?UI.?inspectorView")
      (throw (ex-info "Unable to obtain UI.inspectorView" nil))))

(defn resolved-promise [value]
  (gcall "Promise.resolve" value))

(defn warm-up-namespace-cache! []
  (gcall! "dirac.extractNamespacesAsync"))

(defn throw-internal-error-for-testing! []
  (into nil :keyword))

(defn get-sources-panel-class []
  (or (gget "?Sources.?SourcesPanel")
      (throw (ex-info "Unable to obtain Sources.SourcesPanel from DevTools" nil))))

(defn get-sources-panel-instance-if-avail []
  (oget (get-sources-panel-class) "?_instance"))

(defn get-callstack-pane [sources-panel]
  (oget sources-panel "_callstackPane"))

(defn update-callstack-pane! []
  (when-some [sources-panel (get-sources-panel-instance-if-avail)]
    (ocall (get-callstack-pane sources-panel) "_update")))
