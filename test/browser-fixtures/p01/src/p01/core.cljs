(ns p01.core
  (:refer-clojure :exclude [run!])
  (:require [dirac.fixtures :as fixtures]))

(defn setup! []
  (fixtures/init-devtools!)
  (fixtures/init-transcript! "transcript-box"))

(defn run! []
  (fixtures/do! {:command      :fire-synthetic-chrome-event
                 :chrome-event [:chromex.ext.commands/on-command ["open-dirac-devtools"]]}))

(setup!)
(run!)