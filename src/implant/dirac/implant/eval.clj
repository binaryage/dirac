(ns dirac.implant.eval
  (:require [clojure.java.io :as io]))

(def playground-template-path "dirac/install-playground-runtime-template.js")

(defn read-playground-template []
  (slurp (io/file (io/resource playground-template-path))))

(defmacro emit-install-playground-runtime-template []
  (read-playground-template))

(comment
  (read-playground-template))
