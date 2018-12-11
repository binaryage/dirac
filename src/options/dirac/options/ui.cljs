(ns dirac.options.ui
  (:require [dirac.options.logging :refer [error info log warn]]
            [dirac.options.model :as model]
            [oops.core :refer [gcall]]
            [reforms.core :as f]
            [reforms.rum :include-macros true :as fr]
            [rum.core :as rum :refer-macros [defc]]))

(def default-state {:options model/default-options})

(defonce state (atom {:options model/default-options}))

; -- help strings -----------------------------------------------------------------------------------------------------------

(defn ^:dynamic debugger-url-details []
  (str "Dirac DevTools needs a web-socket connection to Chrome Debugging Protocol. "
       "You have to launch Chrome Canary with --remote-debugging-port=9222 flag. "
       "Please see Dirac installation instructions."))

(defn ^:dynamic welcome-message-details []
  (str "Display a welcome message in Dirac DevTools console on first launch. "
       "People don't read docs and this teaches them how to switch between prompts at least."))

(defn ^:dynamic repl-details []
  (str "Enable REPL subsystem. This toggle is here for emergency reasons."))

(defn ^:dynamic parinfer-details []
  (str "Enable parinfer mode in Dirac REPL prompt. See https://shaunlebron.github.io/parinfer."))

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

(defn ^:dynamic extra-params-details []
  (str "These parameters will be passed into Dirac DevTools app as additional URL parameters."))

(defn ^:dynamic api-details []
  (str "See https://github.com/binaryage/dirac/blob/master/docs/faq.md"
       "#why-should-i-use-recent-chrome-canary-with-dirac-devtools"))

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

(defn reset-to-defaults-and-exit! []
  (reset! state default-state)
  (save-state!)
  (.close js/window))

; -- views ------------------------------------------------------------------------------------------------------------------

(defn switch-view [data key label & [details]]
  (let [label-view (if (some? details)
                     [:span {:title details} label]
                     label)]
    (f/checkbox label-view data [:options key])))

(defn extra-params-view [data]
  (let [details (extra-params-details)
        label-view [:span {:title details} "Extra frontend URL params:"]
        attrs {:title details}
        placeholder "param1=a&param2=b"]
    (f/text attrs label-view data [:options :user-frontend-url-params] :placeholder placeholder)))

(defn debugger-url-view [data]
  (let [details (debugger-url-details)
        label-view [:span {:title details} "Debugger URL:"]
        attrs {:title details}
        placeholder "http://localhost:9222"]
    (f/url attrs label-view data [:options :target-url] :placeholder placeholder)))

(defc options-view < rum/reactive [data]
  (let [form-options {:form         {:horizontal true}
                      :button-group {:align "text-right"}}]
    (fr/with-options form-options
      (f/panel
        (f/form
          {:on-submit save-state-and-exit!}
          (debugger-url-view data)
          (f/select "Open Dirac DevTools as:" data [:options :open-as]
                    [["panel" "a new panel (recommended)"]
                     ["window" "a new window"]
                     ["tab" "a new tab"]])
          [:div {:class "switches"}
           [:label "Switches:"]
           [:div {:class "switches-list"}
            (switch-view data :welcome-message "Print welcome message" (welcome-message-details))
            (switch-view data :enable-repl "Enable REPL" (repl-details))
            (switch-view data :enable-parinfer "Enable Parinfer" (parinfer-details))
            (switch-view data :enable-friendly-locals "Enable friendly locals" (friendly-locals-details))
            (switch-view data :enable-clustered-locals "Enable clustered locals" (clustered-locals-details))
            (switch-view data :inline-custom-formatters "Inline Custom Formatters" (inline-custom-formatters-details))
            (switch-view data :clean-urls "Enable clean URLs" (clean-urls-details))
            (switch-view data :beautify-function-names "Beautify function names" (beautify-function-names-details))
            (switch-view data :link-actions "Enable link actions" (link-actions-details))]]
          (extra-params-view data))
        (f/form-buttons
          (f/button "Reset to Defaults and Exit" reset-to-defaults-and-exit!)
          (f/button "Save and Exit" save-state-and-exit!))))))

(defc main-view [state]
  [:div
   (options-view state)])

; -- mounting ---------------------------------------------------------------------------------------------------------------

(defn mount-ui! [el state]
  (let [root-view (main-view state)]
    (rum/mount root-view el)))

(defn start-ui! []
  (let [root-el (gcall "document.getElementById" "options-form")]
    (assert root-el)
    (load-state!)
    (watch-options!)
    (mount-ui! root-el state)))
