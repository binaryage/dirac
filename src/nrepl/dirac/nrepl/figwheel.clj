(ns dirac.nrepl.figwheel
  "We are friends with Figwheel"
  (:require [clojure.tools.logging :as log]))

; TODO: would be nice to have some version checking (for sanity)
(def ^:dynamic *verbose* false)
(def figwheel-api-ns-sym 'figwheel-sidecar.repl-api)

(defn try-resolve-figwheel-repl-api-symbol [sym]
  (try
    (ns-resolve figwheel-api-ns-sym sym)
    (catch Throwable e
      (when *verbose*
        (log/trace e))
      nil)))

(defn try-resolve-figwheel-repl-api [sym]
  (let [v (try-resolve-figwheel-repl-api-symbol sym)]
    (when (var? v)
      (var-get v))))

(defn get-figwheel-system []
  (when-some [api (try-resolve-figwheel-repl-api '*repl-api-system*)]
    (:figwheel-system api)))

(defn get-figwheel-data []
  (when-some [system (get-figwheel-system)]
    (when-some [data (:system system)]
      @data)))

(defn get-figwheel-server []
  (:figwheel-server (get-figwheel-data)))

(defn get-figwheel-builds []
  (:builds (get-figwheel-server)))

(defn make-figwheel-compiler-id [build-id]
  (str "figwheel/" (or build-id "?")))

(defn make-compiler-descriptor [figwheel-build]
  (when-some [compiler-env (:compiler-env figwheel-build)]
    {:id           (make-figwheel-compiler-id (:id figwheel-build))
     :compiler-env compiler-env}))

(defn collect-available-compiler-descriptors []
  (let [builds (get-figwheel-builds)]
    (keep (fn [[_id build]] (make-compiler-descriptor build)) builds)))

(defn call-repl-api! [fn-name & args]
  (if-some [f (try-resolve-figwheel-repl-api (symbol (name fn-name)))]
    (if (fn? f)
      (apply f args)
      ::not-fn)
    ::not-found))
