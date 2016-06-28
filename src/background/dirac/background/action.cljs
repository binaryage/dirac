(ns dirac.background.action
  (:require-macros [cljs.core.async.macros :refer [go]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [dirac.sugar :refer [tab-exists?]]
            [chromex.ext.browser-action :as browser-action]))

(defonce state-table
  {:waiting       {}
   :connected     {:text "~" :color [0 0 255 255]}
   :not-available {:text "x" :color [128 128 128 255]}
   :error         {:text "!" :color "#ff0000"}
   :warning       {:text "!" :color "#ffff00"}})

(defn color->js [color]
  (cond
    (nil? color) #js [0 0 0 0]
    (vector? color) (into-array color)
    (string? color) color
    :else (assert false (str "invalid color type:" (type color)))))

(defn update-action-button! [backend-tab-id state & [title]]
  (let [{:keys [text color]} (state state-table)]
    (go
      (when (<! (tab-exists? backend-tab-id))                                                                                 ; backend tab might not exist anymore at this point
        (browser-action/set-badge-text #js {"text"  (or text "")
                                            "tabId" backend-tab-id})
        (if color
          (browser-action/set-badge-background-color #js {"color" (color->js color)
                                                          "tabId" backend-tab-id}))
        (if title
          (browser-action/set-title #js {"title" title
                                         "tabId" backend-tab-id}))
        true))))
