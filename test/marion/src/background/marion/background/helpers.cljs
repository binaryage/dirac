(ns marion.background.helpers
  (:require [chromex.ext.management :as management]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.windows :as windows]
            [chromex.protocols.chrome-port :as chrome-port]
            [dirac.settings :refer [get-dirac-runner-window-height get-dirac-runner-window-left
                                    get-dirac-runner-window-top get-dirac-runner-window-width
                                    get-dirac-scenario-window-height get-dirac-scenario-window-left
                                    get-dirac-scenario-window-top get-dirac-scenario-window-width
                                    get-marion-stable-connection-timeout]]
            [dirac.shared.async :refer [<! alts! close! go go-channel  go-wait]]
            [dirac.shared.sugar :as sugar]
            [marion.background.logging :refer [error info log warn]]
            [oops.core :refer [oapply ocall oget]]))

(defn go-find-extension [pred]
  (go
    (let [[extension-infos] (<! (management/get-all))
          match? (fn [extension-info]
                   (if (pred extension-info) extension-info))]
      (some match? extension-infos))))

(defn go-find-extension-by-name [name]
  (go-find-extension (fn [extension-info]
                       (= (oget extension-info "name") name))))

(defn go-create-tab-with-url! [url]
  (go
    (if-let [[tab] (<! (tabs/create #js {:url url}))]
      (sugar/get-tab-id tab))))

(defn go-create-scenario-with-url! [url]
  {:pre [(string? url)]}
  (go
    ; during development we may want to override standard "cascading" of new windows and position the window explicitely
    (let [window-params (sugar/set-window-params-dimensions! #js {:url url}
                                                             (get-dirac-scenario-window-left)
                                                             (get-dirac-scenario-window-top)
                                                             (get-dirac-scenario-window-width)
                                                             (get-dirac-scenario-window-height))
          [_window tab-id] (<! (sugar/go-create-window-and-wait-for-first-tab-completed! window-params))]
      tab-id)))

(defn go-focus-window-with-tab-id! [tab-id]
  (go
    (if-let [window-id (<! (sugar/go-fetch-tab-window-id tab-id))]
      (<! (windows/update window-id #js {"focused"       true
                                         "drawAttention" true})))))

(defn go-activate-tab! [tab-id]
  (tabs/update tab-id #js {"active" true}))

(defn go-find-runner-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {:title "TASK RUNNER"}))]
      (if-let [tab (first tabs)]
        tab
        (warn "no TASK RUNNER tab?")))))

(defn go-find-runner-tab-id! []
  (go
    (if-let [tab (<! (go-find-runner-tab!))]
      (sugar/get-tab-id tab))))

(defn go-reposition-runner-window! []
  (go
    (if-let [tab-id (<! (go-find-runner-tab-id!))]
      (if-let [window-id (<! (sugar/go-fetch-tab-window-id tab-id))]
        (<! (windows/update window-id (sugar/set-window-params-dimensions! #js {}
                                                                           (get-dirac-runner-window-left)
                                                                           (get-dirac-runner-window-top)
                                                                           (get-dirac-runner-window-width)
                                                                           (get-dirac-runner-window-height))))))))

(defn go-close-tab-with-id! [tab-id]
  (tabs/remove tab-id))

(defn go-close-all-scenario-tabs! []
  (go
    (let [[tabs] (<! (tabs/query #js {:url "http://*/scenarios/*"}))]
      (doseq [tab tabs]
        (<! (go-close-tab-with-id! (sugar/get-tab-id tab)))))))

; when dirac extension is busy parsing css/api we might get connect/disconnect events because there is not event loop running
; to respond to ::runtime/on-connect-external, we detect this case here and pretend connection is not available at this stage
(defn go-accept-stable-connection-only [extension-id port]
  (let [timeout-channel (go-wait (get-marion-stable-connection-timeout))
        disconnect-channel (go-channel)]
    (chrome-port/on-disconnect! port #(close! disconnect-channel))
    (go
      (let [[_ channel] (alts! [timeout-channel disconnect-channel])]
        (condp identical? channel
          timeout-channel (do
                            (log (str "dirac extension '" extension-id "' ready!"))
                            port)
          disconnect-channel (do
                               (log (str "dirac extension '" extension-id "' not ready yet"))
                               nil))))))

(defn go-connect-to-dirac-extension! []
  (go
    (when-some [extension-info (<! (go-find-extension-by-name "Dirac DevTools"))]
      (let [extension-id (oget extension-info "id")
            info #js {:name "Dirac Marionettist"}]
        (log (str "dirac extension '" extension-id "' found"))
        (<! (go-accept-stable-connection-only extension-id (runtime/connect extension-id info)))))))

(defn get-client-url [client]
  (let [sender (chrome-port/get-sender client)
        sender-id (oget sender "id")
        sender-url (oget sender "url")]
    (str sender-id ":" sender-url)))
