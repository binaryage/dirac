(ns dirac.automation.options
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close! go go-loop]]
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

(defn go-store-options! []
  (go
    (let [options (<! (messages/go-get-options!))]
      (push-options-to-stack! options))))

(defn go-restore-options! []
  (go
    (let [saved-options (pop-options-from-stack!)]
      (<! (messages/go-reset-options! saved-options)))))
