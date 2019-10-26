(ns dirac.nrepl.shadow
  "We are friends with shadow-cljs"
  (:require [clojure.tools.logging :as log]))

; TODO: would be nice to have some version checking (for sanity)
(def ^:dynamic *verbose* false)
(def shadow-api-ns-sym 'shadow.cljs.devtools.api)
(def shadow-repl-ns-sym 'shadow.cljs.repl)

(defn try-resolve-ns-symbol [ns-sym sym]
  (try
    (ns-resolve ns-sym sym)
    (catch Throwable e
      (when *verbose*
        (log/trace e))
      nil)))

(defn try-resolve-ns-var [ns-sym sym]
  (let [v (try-resolve-ns-symbol ns-sym sym)]
    (when (var? v)
      (var-get v))))

(defn resolve-and-call! [ns-sym fn-sym & args]
  (if-some [var (try-resolve-ns-var ns-sym fn-sym)]
    (do
      (assert (fn? var))
      (apply var args))
    (throw (ex-info (str "unable to resolve expected shadow-cljs api '" shadow-api-ns-sym "." fn-sym "'") {}))))

(defn get-build-ids []
  (resolve-and-call! shadow-api-ns-sym 'get-build-ids))

(defn get-worker [build-id]
  (resolve-and-call! shadow-api-ns-sym 'get-worker build-id))

(defn make-shadow-compiler-id [build-id]
  (str "shadow/" (name (or build-id "?"))))

(defn make-compiler-descriptor [build-id]
  {:id           (make-shadow-compiler-id build-id)
   :compiler-env {::tag     true
                  :build-id build-id}})

(defn collect-available-compiler-descriptors []
  (let [build-ids (get-build-ids)]
    (keep make-compiler-descriptor build-ids)))

(defn call-api! [fn-name & args]
  (if-some [f (try-resolve-ns-var shadow-api-ns-sym (symbol (name fn-name)))]
    (if (fn? f)
      (apply f args)
      ::not-fn)
    ::not-found))

; (:build-state (deref (:state-ref (shadow/get-worker :scenarios04)))))

(defn get-build-state [build-id]
  (if-some [worker (get-worker build-id)]
    (:build-state (deref (:state-ref worker)))))

(defn get-repl-state [build-state]
  (:repl-state build-state))

(defn repl-process-read-result [build-state read-result]
  (resolve-and-call! shadow-repl-ns-sym 'process-read-result build-state read-result))
