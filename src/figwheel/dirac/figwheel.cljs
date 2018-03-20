(ns dirac.figwheel
  (:require [figwheel.client :as figwheel]
            [dirac.shared.utils :refer [runonce when-not-advanced-mode when-not-dirac-test-mode]]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(when-not-advanced-mode
  (when-not-dirac-test-mode
    (runonce
      (figwheel/start
        {;:build-id      ['background 'popup]
         :websocket-url "ws://localhost:7100/figwheel-ws"}))))
