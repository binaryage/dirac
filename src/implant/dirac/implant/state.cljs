; taken from https://github.com/shaunlebron/parinfer
(ns dirac.implant.state
  "State of the editors on our page.")

;; map of editor key -> editor state
(defonce state
  (atom {}))

(defonce empty-editor-state
  {:text ""             ;; text of the editor
   :mode :indent-mode   ;; editor mode (:indent-mode, :paren-mode)
   :cm nil              ;; the CodeMirror instance
   :watcher nil})       ;; the ScrollMonitor instance