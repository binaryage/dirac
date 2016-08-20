(ns dirac.implant.repl
  (:require-macros [dirac.implant.repl :refer [default-specials]]))

(defonce repl-specials (to-array (default-specials)))
(defonce extra-specials #js ["dirac!" "*1" "*2" "*3" "*e"])
(defonce all-specials (.concat repl-specials extra-specials))

