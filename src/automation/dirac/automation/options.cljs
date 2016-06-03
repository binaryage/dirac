(ns dirac.automation.options
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.automation.messages :as messages]))

(defonce options-stack (atom []))

; -- stack manipulation -----------------------------------------------------------------------------------------------------

(defn push-options-to-stack! [options]
  (swap! options-stack conj options))

(defn pop-options-from-stack! []
  {:pre [(not (empty? @options-stack))]}
  (let [top (peek @options-stack)]
    (swap! options-stack pop)
    top))

; -- storing/restoring options ----------------------------------------------------------------------------------------------

(defn store-options! []
  (go
    (let [options (<! (messages/get-options!))]
      (push-options-to-stack! options))))

(defn restore-options! []
  (go
    (let [saved-options (pop-options-from-stack!)]
      (<! (messages/reset-options! saved-options)))))