(ns ^:figwheel-hooks dirac-figmain.core
  (:require
   [goog.dom :as gdom]
   [react :as react]
   [react-dom :as react-dom]
   [sablono.core :as sab :include-macros true]))

(println "This text is printed from src/dirac_figmain/core.cljs. Go ahead and edit it and see reloading in action.")

(defn multiply [a b] (* a b))


;; define your app data so that it doesn't get over-written on reload
(defonce app-state (atom {:text "Hello world!"}))

(defn get-app-element []
  (gdom/getElement "app"))
(defn hello-world [state]
  (sab/html [:div
             [:h1 (:text @state)]
             [:h3 "Edit this in src/dirac_figmain/core.cljs and watch it change!"]]))

(defn mount [el]
  (js/ReactDOM.render (hello-world app-state) el))

(defn mount-app-element []
  (when-let [el (get-app-element)]
    (mount el)))

;; conditionally start your application based on the presence of an "app" element
;; this is particularly helpful for testing this ns without launching the app
(mount-app-element)

;; specify reload hook with ^;after-load metadata
(defn ^:after-load on-reload []
  (mount-app-element)
  ;; optionally touch your app-state to force rerendering depending on
  ;; your application
  ;; (swap! app-state update-in [:__figwheel_counter] inc)
)
