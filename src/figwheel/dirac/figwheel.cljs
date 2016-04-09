(ns ^:figwheel-no-load dirac.figwheel
  (:require [figwheel.client :as figwheel]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(figwheel/start
  {;:build-id      ['background 'popup]
   :websocket-url "ws://localhost:7100/figwheel-ws"})
