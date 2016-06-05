(ns dirac.implant.munging
  (:require [clojure.string :as string]))

(defn is-cljs-function-name? [munged-name]
  (some? (re-matches #"^[^$]+\$[^$]+\$.*$" munged-name)))                                                                     ; must have at least two dollars but not at the beginning

(defn demunge-ns [munged-name]
  (string/replace munged-name "$" "."))

(defn break-and-demunge-name [munged-name]
  (let [index (.lastIndexOf munged-name "$")]
    (if (= index -1)
      ["" (demunge munged-name)]
      (let [ns (demunge (demunge-ns (.substring munged-name 0 index)))
            name (demunge (.substring munged-name (inc index) (.-length munged-name)))]
        [ns name]))))

(defn ns-to-relpath [ns ext]
  (str (string/replace (munge ns) \. \/) "." (name ext)))