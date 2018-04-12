(ns dirac.background.action
  (:require [dirac.shared.async :refer [<! go-channel put! go]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.shared.sugar :refer [go-check-tab-exists?]]
            [chromex.ext.browser-action :as browser-action]))

(def state-table
  {:waiting       {}
   :connected     {:text "~" :color [0 0 255 255]}
   :connecting    {:text "?" :color "#008888"}
   :not-available {:text "x" :color [128 128 128 255]}
   :error         {:text "!" :color "#ff0000"}
   :warning       {:text "!" :color "#ffff00"}})

(def active-icons
  #js {"19" "images/icon19.png"
       "38" "images/icon38.png"})

(defn color->js [color]
  (cond
    (nil? color) #js [0 0 0 0]
    (vector? color) (into-array color)
    (string? color) color
    :else (assert false (str "invalid color type:" (type color)))))

(defn go-update-action-button! [backend-tab-id state & [title]]
  (let [{:keys [text color]} (state state-table)]
    (go
      (when (<! (go-check-tab-exists? backend-tab-id))                                                                        ; backend tab might not exist anymore at this point
        (browser-action/set-badge-text #js {"text"  (or text "")
                                            "tabId" backend-tab-id})
        (if color
          (browser-action/set-badge-background-color #js {"color" (color->js color)
                                                          "tabId" backend-tab-id}))
        (if title
          (browser-action/set-title #js {"title" title
                                         "tabId" backend-tab-id}))
        true))))

(defn go-disable! [tab-id]
  (browser-action/disable tab-id))

(defn go-enable! [tab-id]
  (browser-action/enable tab-id))

(defn go-set-active-icons! []
  (browser-action/set-icon #js {:path active-icons}))
