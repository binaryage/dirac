(ns dirac.nrepl.figwheel
  "We are friends with Figwheel"
  (:require [clojure.tools.logging :as log]
            [dirac.logging :as logging]))

(defn get-figwheel-repl-api []
  (when-let [fig-api-var (ns-resolve 'figwheel-sidecar.repl-api '*repl-api-system*)]
    (assert (var? fig-api-var))
    (var-get fig-api-var)))

(defn get-figwheel-system []
  (if-let [api (get-figwheel-repl-api)]
    (:figwheel-system api)))

(defn get-figwheel-data []
  (if-let [system (get-figwheel-system)]
    (if-let [data (:system system)]
      @data)))

(defn get-figwheel-server []
  (:figwheel-server (get-figwheel-data)))

(defn get-figwheel-builds []
  (:builds (get-figwheel-server)))

(defn make-figwheel-compiler-id [build-id]
  (str "figwheel/" (or build-id "?")))

(defn make-compiler-descriptor [figwheel-build]
  (if-let [compiler-env (:compiler-env figwheel-build)]
    {:id           (make-figwheel-compiler-id (:id figwheel-build))
     :compiler-env compiler-env}))

(defn collect-available-compiler-descriptors []
  (let [builds (get-figwheel-builds)]
    (keep (fn [[_id build]] (make-compiler-descriptor build)) builds)))
