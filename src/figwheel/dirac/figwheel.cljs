(ns dirac.figwheel
  (:require [figwheel.client :as figwheel]
            [dirac.shared.utils :refer [runonce]]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(runonce
  (figwheel/start
    {;:build-id      ['background 'popup]
     :websocket-url "ws://localhost:7100/figwheel-ws"}))
