(ns dirac.options.ui
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [rum.core :as rum :refer-macros [defc]]
            [dirac.options.model :as model]
            [reforms.rum :include-macros true :as fr]
            [reforms.core :as f]))

(defonce default-state {:options model/default-options})

(defonce state (atom {:options model/default-options}))

; -- supporting functions ---------------------------------------------------------------------------------------------------

(defn save-state! []
  (model/reset-options! (:options @state)))

(defn save-state-and-exit! []
  (save-state!)
  (.close js/window))

(defn load-state! []
  (swap! state assoc :options (model/get-options)))

(defn watch-options! []
  (add-watch model/cached-options :options-ui load-state!))

(defn reset-to-defaults! []
  (reset! state default-state)
  (save-state!))

(defn option-switch [data key label & [details]]
  (let [label-view (if (some? details)
                     [:span {:title details} label]
                     label)]
    (f/checkbox label-view data [:options key])))

; -- views ------------------------------------------------------------------------------------------------------------------

(defc options-view < rum/reactive [data]
  (let [form-options {:form         {:horizontal true}
                      :button-group {:align "text-right"}}]
    (fr/with-options form-options
      (f/panel
        (f/form
          {:on-submit save-state-and-exit!}
          (f/url "Debugger URL:" data [:options :target-url] :placeholder "http://localhost:9222")
          (f/select "Open Dirac DevTools:" data [:options :open-as]
                    [["panel" "as a new panel (recommended)"]
                     ["window" "as a new window"]
                     ["tab" "as a new tab"]])
          [:div {:class "switches"}
           (option-switch data :welcome-message "Print welcome message")
           (option-switch data :enable-repl "Enable REPL")
           (option-switch data :enable-parinfer "Enable Parinfer")
           (option-switch data :enable-friendly-locals "Enable friendly locals")
           (option-switch data :enable-clustered-locals "Enable clustered locals")
           (option-switch data :inline-custom-formatters "Inline Custom Formatters")
           (option-switch data :clean-urls "Enable clean URLs")
           (option-switch data :beautify-function-names "Beautify function names")
           (option-switch data :link-actions "Enable link actions")
           (option-switch data :use-backend-supported-api "Use backend-supported API")
           (option-switch data :use-backend-supported-css "Use backend-supported CSS")]
          (f/text "Extra frontend URL params:" data [:options :user-frontend-url-params]))
        (f/form-buttons
          (f/button "Reset to Defaults" reset-to-defaults!)
          (f/button "Save and Exit" save-state-and-exit!))))))

(defc main-view [state]
  [:div
   (options-view state)])

; -- mounting ---------------------------------------------------------------------------------------------------------------

(defn mount-ui! [el state]
  (let [root-view (main-view state)]
    (rum/mount root-view el)))

(defn start-ui! []
  (let [root-el (.getElementById js/document "options-form")]
    (assert root-el)
    (load-state!)
    (watch-options!)
    (mount-ui! root-el state)))
