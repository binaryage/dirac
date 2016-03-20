(ns dirac.automation
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [dirac.fixtures :refer [setup! last-dirac-frontend-id fire-chrome-event! automate-dirac-frontend!
                                    wait-for-transcript-match post-marion-command!]
             :refer-macros [without-transcript]]))

; -- automation commands ----------------------------------------------------------------------------------------------------

(defn open-dirac-devtools! []
  (fire-chrome-event! [:chromex.ext.commands/on-command ["open-dirac-devtools"]]))

(defn close-dirac-devtools! []
  (fire-chrome-event! [:chromex.ext.commands/on-command ["close-dirac-devtools" @last-dirac-frontend-id]]))

(defn switch-inspector-panel! [panel]
  (automate-dirac-frontend! {:action :switch-inspector-panel
                             :panel  panel}))

(defn focus-console-prompt! []
  (automate-dirac-frontend! {:action :focus-console-prompt}))

(defn switch-to-dirac-prompt! []
  (automate-dirac-frontend! {:action :switch-to-dirac-prompt}))

(defn switch-to-js-prompt! []
  (automate-dirac-frontend! {:action :switch-to-js-prompt}))

; -- waiting for transcript feedback ----------------------------------------------------------------------------------------

(defn wait-for-dirac-frontend-initialization []
  (wait-for-transcript-match #".*register dirac connection #(.*)"))

(defn wait-for-implant-initialization []
  (wait-for-transcript-match #".*implant initialized.*"))

(defn wait-for-console-initialization [& [timeout silent?]]
  (wait-for-transcript-match #".*console initialized.*" timeout silent?))

(defn wait-switch-to-console []
  (go
    ; panel selection history may perform automatic console switch
    ; wait for it here
    (let [res (<! (wait-for-console-initialization 1000 true))]
      (when (= res :timeout)
        ; console panel wasn't switched => perform it by hand and wait for result
        (without-transcript
          (switch-inspector-panel! :console))
        (<! (wait-for-console-initialization))))))
