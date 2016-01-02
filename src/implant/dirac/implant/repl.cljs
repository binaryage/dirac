(ns weasel.repl
  (:require [goog.dom :as gdom]
            [clojure.browser.event :as event :refer [event-types]]
            [clojure.browser.net :as net]
            [clojure.browser.repl :as brepl]
            [cljs.reader :as reader :refer [read-string]]
            [weasel.impls.websocket :as ws]))

(def ^:private ws-connection (atom nil))

(defn alive? []
  "Returns truthy value if the REPL is attempting to connect or is
   connected, or falsy value otherwise."
  (not (nil? @ws-connection)))

(defmulti process-message :op)

(defmethod process-message
  :error
  [message]
  (.error js/console (str "Websocket REPL error " (:type message))))

(defmethod process-message
  :eval-js
  [message]
  (let [code (:code message)]
    {:op :result
     :value (try
              {:status :success, :value (str (js* "eval(~{code})"))}
              (catch js/Error e
                {:status :exception
                 :value (pr-str e)
                 :stacktrace (if (.hasOwnProperty e "stack")
                               (.-stack e)
                               "No stacktrace available.")})
              (catch :default e
                {:status :exception
                 :value (pr-str e)
                 :stacktrace "No stacktrace available."}))}))

(defn repl-print
  [& args]
  (if-let [conn @ws-connection]
    (net/transmit @ws-connection {:op :print :value (apply pr-str args)})))

(defn console-print [& args]
  (.apply (.-log js/console) js/console (into-array args)))

(def print-fns
  {:repl repl-print
   :console console-print
   #{:repl :console} (fn [& args]
                       (apply console-print args)
                       (apply repl-print args))})

(defn connect
  [repl-server-url & {:keys [verbose on-open on-error on-close print]
                      :or {verbose true, print :repl}}]
  (let [repl-connection (ws/websocket-connection)]
    (swap! ws-connection (constantly repl-connection))
    (event/listen repl-connection :opened
      (fn [evt]
        (set-print-fn! (if (fn? print) print (get print-fns print)))
        (net/transmit repl-connection (pr-str {:op :ready}))
        (when verbose (.info js/console "Opened Websocket REPL connection"))
        (when (fn? on-open) (on-open))))

    (event/listen repl-connection :message
      (fn [evt]
        (let [{:keys [op] :as message} (read-string (.-message evt))
              response (-> message process-message pr-str)]
          (net/transmit repl-connection response))))

    (event/listen repl-connection :closed
      (fn [evt]
        (reset! ws-connection nil)
        (when verbose (.info js/console "Closed Websocket REPL connection"))
        (when (fn? on-close) (on-close))))

    (event/listen repl-connection :error
      (fn [evt]
        (when verbose (.error js/console "WebSocket error" evt))
        (when (fn? on-error) (on-error evt))))

    ;; reusable bootstrap
    (brepl/bootstrap)

    (net/connect repl-connection repl-server-url)))
