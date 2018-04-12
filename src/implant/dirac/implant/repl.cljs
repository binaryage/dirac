(ns dirac.implant.repl
  (:require-macros [dirac.implant.repl :refer [default-specials]]))

(def repl-specials (to-array (default-specials)))
(def extra-specials #js ["dirac!" "*1" "*2" "*3" "*e"])
(def all-specials (.concat repl-specials extra-specials))

