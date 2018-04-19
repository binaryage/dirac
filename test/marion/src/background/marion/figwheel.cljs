(ns marion.figwheel
  (:require [dirac.shared.utils :refer [runonce when-not-advanced-mode when-not-dirac-test-mode]]
            [figwheel.client :as figwheel]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(when-not-advanced-mode
  (when-not-dirac-test-mode
    (runonce
      (figwheel/start
        {:websocket-url "ws://localhost:7200/figwheel-ws"}))))
