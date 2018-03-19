(ns marion.background.helpers
  (:require-macros [marion.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout alts! go go-loop close!]]
            [oops.core :refer [oget ocall oapply]]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.management :as management]
            [chromex.ext.windows :as windows]
            [chromex.protocols :refer [on-disconnect! get-sender]]
            [dirac.settings :refer-macros [get-dirac-scenario-window-top get-dirac-scenario-window-left
                                           get-dirac-scenario-window-width get-dirac-scenario-window-height
                                           get-dirac-runner-window-top get-dirac-runner-window-left
                                           get-dirac-runner-window-width get-dirac-runner-window-height
                                           get-marion-stable-connection-timeout]]
            [dirac.shared.sugar :as sugar]))

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

(defn create-scenario-with-url! [url]
  {:pre [(string? url)]}
  (go
    ; during development we may want to override standard "cascading" of new windows and position the window explicitely
    (let [window-params (sugar/set-window-params-dimensions! #js {:url url}
                                                             (get-dirac-scenario-window-left)
                                                             (get-dirac-scenario-window-top)
                                                             (get-dirac-scenario-window-width)
                                                             (get-dirac-scenario-window-height))
          [_window tab-id] (<! (sugar/create-window-and-wait-for-first-tab-completed! window-params))]
      tab-id)))

(defn focus-window-with-tab-id! [tab-id]
  (go
    (if-let [window-id (<! (sugar/fetch-tab-window-id tab-id))]
      (<! (windows/update window-id #js {"focused"       true
                                         "drawAttention" true})))))

(defn activate-tab! [tab-id]
  (tabs/update tab-id #js {"active" true}))

(defn find-runner-tab! []
  (go
    (let [[tabs] (<! (tabs/query #js {:title "TASK RUNNER"}))]
      (if-let [tab (first tabs)]
        tab
        (warn "no TASK RUNNER tab?")))))

(defn find-runner-tab-id! []
  (go
    (if-let [tab (<! (find-runner-tab!))]
      (sugar/get-tab-id tab))))

(defn reposition-runner-window! []
  (go
    (if-let [tab-id (<! (find-runner-tab-id!))]
      (if-let [window-id (<! (sugar/fetch-tab-window-id tab-id))]
        (<! (windows/update window-id (sugar/set-window-params-dimensions! #js {}
                                                                           (get-dirac-runner-window-left)
                                                                           (get-dirac-runner-window-top)
                                                                           (get-dirac-runner-window-width)
                                                                           (get-dirac-runner-window-height))))))))

(defn close-tab-with-id! [tab-id]
  (tabs/remove tab-id))

(defn close-all-scenario-tabs! []
  (go
    (let [[tabs] (<! (tabs/query #js {:url "http://*/scenarios/*"}))]
      (doseq [tab tabs]
        (<! (close-tab-with-id! (sugar/get-tab-id tab)))))))

; when dirac extension is busy parsing css/api we might get connect/disconnect events because there is not event loop running
; to respond to ::runtime/on-connect-external, we detect this case here and pretend connection is not available at this stage
(defn accept-stable-connection-only [extension-id port]
  (let [timeout-channel (timeout (get-marion-stable-connection-timeout))
        disconnect-channel (chan)]
    (on-disconnect! port #(close! disconnect-channel))
    (go
      (let [[_ channel] (alts! [timeout-channel disconnect-channel])]
        (condp identical? channel
          timeout-channel (do
                            (log (str "dirac extension '" extension-id "' ready!"))
                            port)
          disconnect-channel (do
                               (log (str "dirac extension '" extension-id "' not ready yet"))
                               nil))))))

(defn connect-to-dirac-extension! []
  (go
    (when-some [extension-info (<! (find-extension-by-name "Dirac DevTools"))]
      (let [extension-id (oget extension-info "id")]
        (log (str "dirac extension '" extension-id "' found"))
        (<! (accept-stable-connection-only extension-id (runtime/connect extension-id #js {:name "Dirac Marionettist"})))))))

(defn get-client-url [client]
  (let [sender (get-sender client)
        sender-id (oget sender "id")
        sender-url (oget sender "url")]
    (str sender-id ":" sender-url)))
