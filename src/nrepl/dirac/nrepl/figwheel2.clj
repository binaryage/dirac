(ns dirac.nrepl.figwheel2
  "We are friends with Figwheel Main"
  (:require [clojure.tools.logging :as log]
            [clojure.string :as string]))

; TODO: would be nice to have some version checking (for sanity)
(def ^:dynamic *verbose* false)

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

(defn get-figwheel-build-registry []
  (try-resolve-ns-var 'figwheel.main 'build-registry))

(defn get-all-figwheel-builds []
  (if-some [registry (get-figwheel-build-registry)]
    @registry))

(defn make-figwheel-compiler-id [build-id]
  (str "figwheel.main/" (or build-id "?")))

(defn make-compiler-descriptor [figwheel-build]
  (when-some [compiler-env (get-in figwheel-build [:repl-options :compiler-env])]
    {:id           (make-figwheel-compiler-id (:id figwheel-build))
     :compiler-env compiler-env}))

(defn collect-available-compiler-descriptors []
  (let [builds (get-all-figwheel-builds)]
    (keep (fn [[_id build]] (make-compiler-descriptor build)) builds)))

(defn normalize-name [v]
  (symbol (name v)))

(defn try-resolve-callable-api [qualified-sym-name]
  (assert (qualified-symbol? qualified-sym-name))
  (let [val (try-resolve-ns-symbol (symbol (namespace qualified-sym-name)) (symbol (name qualified-sym-name)))]
    (when (var? val)
      [(meta val) (var-get val)])))

(defn prepare-api-call-form [qualified-sym-name args]
  `(do
     (require (quote ~(symbol (namespace qualified-sym-name))))
     (~qualified-sym-name ~@args)))

(defn macro? [var-descriptor]
  (true? (:macro var-descriptor)))

(defn symbolize-name [n]
  (cond
    (symbol? n) n
    (nil? n) (symbol "")
    :else (symbol n)))

(defn non-blank [x]
  (if-not (string/blank? x)
    x))

(defn resolve-full-api-name [n]
  (let [sym-name (symbolize-name n)
        ns-name (or (non-blank (namespace sym-name)) "figwheel.main")
        var-name (or (non-blank (name sym-name)) "status")]
    (symbol ns-name var-name)))

(defn get-first-build []
  (second (first (get-all-figwheel-builds))))

(defn evil-eval! [qualified-sym-name args]
  (let [form (prepare-api-call-form qualified-sym-name args)
        first-figwheel-repl-env (:repl-env (get-first-build))]
    ; binding cljs.repl/*repl-env* is needed for some figwheel calls, for example figwheel.repl/conns
    ; TODO: figure out a better way how to handle repl envs in multiple builds
    (binding [cljs.repl/*repl-env* first-figwheel-repl-env]
      (eval form))))

(defn call-repl-api! [full-api-name & args]
  (assert (qualified-symbol? full-api-name))
  (if-some [[var-descriptor var-value] (try-resolve-callable-api full-api-name)]
    (cond
      ; in case of a macro we have to resort to evil eval
      (macro? var-descriptor) (evil-eval! full-api-name args)
      (fn? var-value) (apply var-value args)
      :else ::not-callable)
    ::not-found))
