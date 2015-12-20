(ns dirac.background.state
  (:require [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]))

(def initial-state
  {:connections {}})                                                                                                          ; pairings between dirac instances and connected tabs

(def state (atom initial-state))