(ns dirac.options.ui
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [rum.core :include-macros true :as rum :refer-macros [defc]]
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

; -- views ------------------------------------------------------------------------------------------------------------------

(defc options-view < rum/cursored rum/cursored-watch [data]
  (let [form-options {:form         {:horizontal true}
                      :button-group {:align "text-right"}}]
    (fr/with-options form-options
      (f/panel
        (f/form
          {:on-submit save-state-and-exit!}
          (f/url "Target URL for debugger:" data [:options :target-url] :placeholder "http://localhost:9222")
          (f/select "Open Dirac DevTools:" data [:options :open-as]
                    [["panel" "as a new panel (recommended)"]
                     ["window" "as a new window"]
                     ["tab" "as a new tab"]])
          [:div {:class "switches"}
           (f/checkbox "Enable REPL" data [:options :enable-repl])
           (f/checkbox "Enable Parinfer" data [:options :enable-parinfer])
           (f/checkbox "Enable friendly locals" data [:options :enable-friendly-locals])
           (f/checkbox "Enable clustered locals" data [:options :enable-clustered-locals])
           (f/checkbox "Inline Custom Formatters in sources" data [:options :inline-custom-formatters])])
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