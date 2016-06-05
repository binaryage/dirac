(ns dirac.implant.analyzer
  (:require-macros [cljs.analyzer.macros :refer [no-warn]])
  (:require [cljs.analyzer :as ana]
            [cljs.tools.reader.reader-types :as tools-reader-types]
            [clojure.tools.namespace.parse :as ns-parse]))

(defn analyze-ns [ns-form opts]
  (let [env (ana/empty-env)]
    (no-warn (ana/analyze env ns-form nil opts))))

(defn parse-ns-form [source]
  (let [reader (tools-reader-types/string-push-back-reader source)]
    (ns-parse/read-ns-decl reader)))

(defn remove-identical-mappings [mapping]
  (into {} (remove (fn [[alias ns]] (= alias ns)) mapping)))

(defn get-aliases [mapping]
  (-> mapping
      (remove-identical-mappings)))

(defn get-uses [mapping]
  (-> mapping
      (remove-identical-mappings)))

(defn collect-macro-namespaces [ast]
  (let [{:keys [use-macros require-macros]} ast]
    (-> (concat (vals use-macros) (vals require-macros))
        (sort)
        (dedupe))))

(defn parse-ns-from-source [source]
  (when-let [ns-form (parse-ns-form source)]
    (let [ast (analyze-ns ns-form {})]
      #js {"name"                    (str (:name ast))
           "namespaceAliases"        (clj->js (get-aliases (:requires ast)))
           "macroNamespaceAliases"   (clj->js (get-aliases (:require-macros ast)))
           "namespaceRefers"         (clj->js (get-uses (:uses ast)))
           "macroRefers"             (clj->js (get-uses (:use-macros ast)))
           "detectedMacroNamespaces" (clj->js (collect-macro-namespaces ast))})))