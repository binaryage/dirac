(ns dirac.implant.repl
  (:require [cljs.repl :refer [default-special-fns]]))

(defmacro default-specials []
  `(vector ~@(distinct (map name (keys default-special-fns)))))