(ns dirac.implant.munging
  (:require [clojure.string :as string]
            [devtools.munging :as munging]
            [oops.core :refer [gcall oapply ocall oget oset!]]))

(defn is-cljs-function-name? [munged-name]
  (or (empty? munged-name)
      (munging/cljs-fn-name? munged-name)))

(defn ns-detector [name]
  (let [demunged-name (demunge name)
        namespace-descriptor (gcall "dirac.getNamespace" demunged-name)]
    (some? namespace-descriptor)))

(defn present-function-name [munged-name & [include-ns? include-protocol-ns?]]
  (if (empty? munged-name)
    "λ"
    (let [present-opts {:include-ns?               include-ns?
                        :include-protocol-ns?      include-protocol-ns?
                        :silence-common-protocols? false
                        :ns-detector               ns-detector}]
      (munging/present-function-name munged-name present-opts))))

(defn ns-to-relpath [ns ext]
  (str (string/replace (munge ns) \. \/) "." (name ext)))
