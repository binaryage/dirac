(ns dirac.utils
  ; stay lean, do not bring here any exotic deps!
  (:require [clojure.pprint :refer [pprint]]))

(defn pp [data & [level length]]
  (with-out-str
    (binding [*print-level* (or level 5)                                                                                      ; we have to be careful here, data might contain circular references
              *print-length* (or length 200)]
      (pprint data))))

(defn get-env-vars []
  (-> {}
      (into (System/getenv))
      (into (System/getProperties))))

(defn deep-merge-ignoring-nils
  "Recursively merges maps. If keys are not maps, the last value wins. Nils are ignored."
  [& vals]
  (let [non-nil-vals (remove nil? vals)]
    (if (every? map? non-nil-vals)
      (apply merge-with deep-merge-ignoring-nils non-nil-vals)
      (last non-nil-vals))))

(defn remove-keys-with-nil-val [m]
  (into {} (remove (comp nil? second) m)))
