(ns dirac.background.action
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [goog.string :as gstring]
            [goog.string.format]
            [cljs.core.async :refer [<! chan]]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [chromex.chrome-event-channel :refer [make-chrome-event-channel]]
            [chromex.protocols :refer [post-message! get-sender]]
            [chromex.ext.windows :as windows]
            [chromex.ext.tabs :as tabs]
            [chromex.ext.browser-action :as browser-action]
            [chromex.ext.runtime :as runtime]
            [chromex.ext.extension :as extension]
            [chromex.ext.commands :as commands]
            [dirac.background.cors :refer [setup-cors-rewriting!]]
            [dirac.options.model :refer [get-option]]
            [dirac.target.core :refer [resolve-backend-url]]
            [clojure.string :as string]))

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
