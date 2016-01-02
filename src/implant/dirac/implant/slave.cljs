(ns dirac.implant.slave
  (:require [dirac.implant.weasel :as weasel]
            [chromex.logging :refer-macros [log warn error]]))

(defn connect-master [url]
  (weasel/connect url
                  :verbose true
                  :print #{:repl :console}
                  :on-error #(error "Slave error! " %)))