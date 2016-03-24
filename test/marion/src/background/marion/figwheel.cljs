(ns marion.figwheel
  (:require [figwheel.client :as figwheel]))

; -------------------------------------------------------------------------------------------------------------------
; has to be included before boot

(figwheel/start
  {:websocket-url "ws://localhost:7200/figwheel-ws"})
