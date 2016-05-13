; taken from https://github.com/shaunlebron/parinfer
(ns dirac.implant.support
  "Connects parinfer mode functions to CodeMirror"
  (:require
    [clojure.string :refer [join]]
    [chromex.support :refer-macros [oget ocall oapply]]
    [dirac.implant.parinfer :refer [indent-mode paren-mode]]
    [dirac.implant.state :refer [state]]))


(defprotocol IEditor
  "Custom data/methods for a CodeMirror editor."
  (cm-key [this])
  (get-prev-state [this])
  (frame-updated? [this])
  (set-frame-updated! [this value]))

;;----------------------------------------------------------------------
;; Operations
;;----------------------------------------------------------------------

(defn compute-cursor-dx
  [_cursor change]
  (when change
    (let [;; This is a hack for codemirror.
          ;; For some reason codemirror triggers an "+input" change after the
          ;; indent spaces are already applied.  So I modified codemirror to
          ;; label these changes as +indenthack so we can ignore them.
          ignore? (= "+indenthack" (oget change "origin"))]
      (if ignore?
        0
        (let [start-x (oget change "to" "ch")
              new-lines (oget change "text")
              len-last-line (count (last new-lines))
              end-x (if (> (count new-lines) 1)
                      len-last-line
                      (+ len-last-line (oget change "from" "ch")))]
          (- end-x start-x))))))

(defn fix-text!
  "Correctly format the text from the given editor."
  [cm & {:keys [change use-cache?]
         :or   {change nil, use-cache? false}}]
  (let [;; get the current state of the editor
        ;; (e.g. text, cursor, selections, scroll)

        current-text (ocall cm "getValue")
        selection? (ocall cm "somethingSelected")
        selections (ocall cm "listSelections")
        cursor (ocall cm "getCursor")
        scroller (ocall cm "getScrollerElement")
        scroll-x (oget scroller "scrollLeft")
        scroll-y (oget scroller "scrollTop")

        options {:cursor-line (oget cursor "line")
                 :cursor-x    (oget cursor "ch")
                 :cursor-dx   (compute-cursor-dx cursor change)}

        key- (cm-key cm)
        mode (or (get-in @state [key- :mode]) :indent-mode)

        result
        (case mode
          :indent-mode (indent-mode current-text options)
          :paren-mode (paren-mode current-text options)
          nil)

        ;; format the text
        new-text (:text result)
        new-cursor-x (:cursor-x result)]

    ;; update the text
    (swap! state assoc-in [key- :text] new-text)

    ;; restore the selection, cursor, and scroll
    ;; since these are reset when overwriting codemirror's value.
    (if selection?
      (ocall cm "setSelections" selections)
      (ocall cm "setCursor" (oget cursor "line") new-cursor-x))
    (ocall cm "scrollTo" scroll-x scroll-y)))