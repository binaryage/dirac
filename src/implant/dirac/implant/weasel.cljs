; initial version taken from https://github.com/tomjakubowski/weasel/tree/8bfeb29dbaf903e299b2a3296caed52b5761318f
(ns dirac.implant.weasel
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [<! chan put!]]
            [clojure.browser.event :as event :refer [event-types]]
            [clojure.browser.net :as net]
            [cljs.reader :refer [read-string]]
            [dirac.implant.websocket :as ws]
            [clojure.string :as string]))

(def ^:private ws-connection (atom nil))

(defn alive? []
  (not (nil? @ws-connection)))

(defmulti process-message :op)

(defmethod process-message
  :error
  [message]
  (.error js/console (str "Websocket REPL error " (:type message))))

(def ^:dynamic code-template
  "try{
    devtools.dirac.postprocess_successful_eval({code})
   } catch (e) {
    devtools.dirac.postprocess_unsuccessful_eval(e)
   }")

(defn eval-and-postprocess [code]
  (let [result-chan (chan)
        wrapped-code (string/replace code-template "{code}" code)
        result-handler (fn [result, thrown?, exception-details]
                         ; for result structure refer to
                         ;   devtools.api.postprocess_successful_eval and devtools.api.postprocess_unsuccessful_eval
                         (assert (not thrown?)
                                 (str "wrapped code must never throw!\n" (pr-str exception-details)))
                         (assert (not (nil? result))
                                 (str "wrapped code must return non-null postprocessed result"
                                      "result: '" (pr-str result) "' type: " (type result)))
                         (assert (= (aget result "type") "object")
                                 "wrapped code must return a js object with type key set to \"object\"")
                         (let [value (aget result "value")]
                           (assert value "wrapped code must return a js object with \"value\" key defined")
                           (put! result-chan value)))]
    (js/dirac.evalInCurrentContext wrapped-code result-handler)
    result-chan))

(defmethod process-message
  :eval-js
  [message]
  (go
    (let [result (<! (eval-and-postprocess (:code message)))]
      {:op    :result
       :value (-> result
                  (js->clj :keywordize-keys true)
                  (update :status keyword))})))

(defn repl-print
  [& args]
  (if-let [conn @ws-connection]
    (net/transmit conn {:op :print :value (apply pr-str args)})))

(defn console-print [& args]
  (.apply (.-log js/console) js/console (into-array args)))

(def print-fns
  {:repl             repl-print
   :console          console-print
   #{:repl :console} (fn [& args]
                       (apply console-print args)
                       (apply repl-print args))})

(defn connect
  [repl-server-url & {:keys [verbose on-open on-error on-close print]
                      :or   {verbose true, print :repl}}]
  (let [repl-connection (ws/websocket-connection)]
    (swap! ws-connection (constantly repl-connection))
    (event/listen repl-connection :opened (fn [evt]
                                            (set-print-fn! (if (fn? print) print (get print-fns print)))
                                            (net/transmit repl-connection (pr-str {:op :ready}))
                                            (when verbose (.info js/console "Opened Websocket REPL connection"))
                                            (when (fn? on-open) (on-open))))

    (event/listen repl-connection :message (fn [evt]
                                             (let [{:keys [op] :as message} (read-string (.-message evt))]
                                               (go
                                                 (let [result (<! (process-message message))]
                                                   (net/transmit repl-connection (pr-str result)))))))

    (event/listen repl-connection :closed (fn [evt]
                                            (reset! ws-connection nil)
                                            (when verbose (.info js/console "Closed Websocket REPL connection"))
                                            (when (fn? on-close) (on-close))))

    (event/listen repl-connection :error (fn [evt]
                                           (when verbose (.error js/console "WebSocket error" evt))
                                           (when (fn? on-error) (on-error evt))))

    (net/connect repl-connection repl-server-url)))