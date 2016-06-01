(ns marion.background.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.extension :as extension]
            [chromex.ext.management :as management]
            [chromex.ext.windows :as windows]
            [dirac.sugar :as sugar]))

(defn find-extension [pred]
  (go
    (let [[extension-infos] (<! (management/get-all))
          match? (fn [extension-info]
                   (if (pred extension-info) extension-info))]
      (some match? extension-infos))))

(defn find-extension-by-name [name]
  (find-extension (fn [extension-info]
                    (= (oget extension-info "name") name))))

(defn create-tab-with-url! [url]
  (go
    (if-let [[tab] (<! (tabs/create #js {:url url}))]
      (sugar/get-tab-id tab))))

(defn focus-window-with-tab-id! [tab-id]
  (go
    (if-let [window-id (<! (sugar/fetch-tab-window-id tab-id))]
      (<! (windows/update window-id #js {"focused"       true
                                         "drawAttention" true})))))

(defn activate-tab! [tab-id]
  (tabs/update tab-id #js {"active" true}))

(defn find-task-runner-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {:title "TASK RUNNER"}))]
      (if-let [tab (first tabs)]
        tab
        (warn "no TASK RUNNER tab?")))))

(defn find-task-runner-tab-id! []
  (go
    (if-let [tab (<! (find-task-runner-tab!))]
      (sugar/get-tab-id tab))))

(defn close-tab-with-id! [tab-id]
  (tabs/remove tab-id))

(defn close-all-scenario-tabs! []
  (go
    (let [[tabs] (<! (tabs/query #js {:url "http://*/scenarios/*"}))]
      (doseq [tab tabs]
        (<! (close-tab-with-id! (sugar/get-tab-id tab)))))))

(defn connect-to-dirac-extension! []
  (go
    (if-let [extension-info (<! (find-extension-by-name "Dirac DevTools"))]
      (let [extension-id (oget extension-info "id")]
        (log (str "found dirac extension id: '" extension-id "'"))
        (runtime/connect extension-id #js {:name "Dirac Marionettist"})))))

