(ns dirac.implant.munging
  (:require [clojure.string :as string]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [devtools.munging :as m]))

(defn is-cljs-function-name? [munged-name]
  (m/cljs-fn-name? munged-name))

(defn ns-detector [name]
  (some? (ocall (oget js/window "dirac") "getNamespace" name)))

(defn present-function-name [munged-name & [include-ns? include-protocol-ns?]]
  (m/present-function-name munged-name {:include-ns?               include-ns?
                                        :include-protocol-ns?      include-protocol-ns?
                                        :silence-common-protocols? false
                                        :ns-detector               ns-detector}))

(defn ns-to-relpath [ns ext]
  (str (string/replace (munge ns) \. \/) "." (name ext)))
