(ns dirac.options.ui
  (:require [chromex.logging :refer-macros [log info warn error group group-end]]
            [rum.core :as rum :refer-macros [defc]]
            [dirac.options.model :as model]
            [reforms.rum :include-macros true :as fr]
            [reforms.core :as f]))

(defonce default-state {:options model/default-options})

(defonce state (atom {:options model/default-options}))

(defn ^:dynamic friendly-locals-details []
  (str "We will apply some renaming logic to make some generated variable names less painful to look at. "
       "Basically we strip compiler-generated indices and replace them with our own local numbers displayed as subscripts."))

(defn ^:dynamic clustered-locals-details []
  (str "We will group object properties into clusters according to some heuristics. "
       "For example nice names should go first, names looking like macro-generated names should go next "
       "and null values should go last."))

(defn ^:dynamic inline-custom-formatters-details []
  (str "We will inline custom formatters on Sources Panel when debugging Javascript code."))

(defn ^:dynamic clean-urls-details []
  (str "We will strip extra url parameter in various UI widgets. "
       "Figwheel tends to add cache busting timestamps and this makes the DevTools UI very noisy."))

(defn ^:dynamic beautify-function-names-details []
  (str "We will to guess original function names in ClojureScript. "
       "Also we try to decorate names with other useful hints (arities, protocols, etc.)"))

(defn ^:dynamic link-actions-details []
  (str "For example 'Reveal via nREPL' when you right-click url links."))

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
           (option-switch data :enable-friendly-locals "Enable friendly locals" (friendly-locals-details))
           (option-switch data :enable-clustered-locals "Enable clustered locals" (clustered-locals-details))
           (option-switch data :inline-custom-formatters "Inline Custom Formatters" (inline-custom-formatters-details))
           (option-switch data :clean-urls "Enable clean URLs" (clean-urls-details))
           (option-switch data :beautify-function-names "Beautify function names" (beautify-function-names-details))
           (option-switch data :link-actions "Enable link actions" (link-actions-details))
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
