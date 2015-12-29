(ns dirac.background.action
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.ext.browser-action :as browser-action]))

(def state-table
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

(defn update-action-button [tab-id state & [title]]
  (let [{:keys [text color]} (state state-table)]
    (browser-action/set-badge-text #js {"text"  (or text "")
                                        "tabId" tab-id})
    (if color
      (browser-action/set-badge-background-color #js {"color" (color->js color)
                                                      "tabId" tab-id}))
    (if title
      (browser-action/set-title #js {"title" title
                                     "tabId" tab-id}))))
