(ns dirac.nrepl.requests
  (:require [dirac.nrepl.state :as state]))

(defn ^:dynamic make-handler-conversion-error [handler]
  (str "Handler has to be either a function, a string or a list (code).\n"
       "Provided handler is of type " (type handler) ":\n"
       (pr-str handler)))

(defn make-callable-handler [handler]
  (fn [& args]
    (eval `(apply ~handler ~(vec args)))))

(defn turn-handler-into-callable [handler]
  (cond
    (fn? handler) handler
    (string? handler) (make-callable-handler (read-string handler))
    (list? handler) (make-callable-handler handler)
    :else (throw (ex-info (make-handler-conversion-error handler) {:hander handler}))))

; == handle-request! ========================================================================================================

(defmulti handle-request! (fn [request & _args] (keyword request)))

; -- reveal-url -------------------------------------------------------------------------------------------------------------

(defmethod handle-request! :reveal-url [_ payload]
  (let [config (state/get-session-dirac-nrepl-config)]
    (when-some [handler (:reveal-url-request-handler config)]
      (let [{:keys [url line column]} payload]
        (try
          (let [handler-fn (turn-handler-into-callable handler)]
            (handler-fn config url line column))
          (catch Throwable e
            (str "Unable to evaluate :reveal-url-request-handler from your nREPL config: " (.getMessage e))))))))
