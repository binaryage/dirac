(ns marion.figwheel
  (:require [figwheel.client :as figwheel]
            [dirac.shared.utils :refer [runonce when-not-advanced-mode when-not-dirac-test-mode]]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(when-not-advanced-mode
  (when-not-dirac-test-mode
    (runonce
      (figwheel/start
        {:websocket-url "ws://localhost:7200/figwheel-ws"}))))
