; taken from https://github.com/shaunlebron/parinfer
(ns dirac.implant.support
  "Connects parinfer mode functions to CodeMirror"
  (:require
    [clojure.string :refer [join]]
    [parinfer.indent-mode :as indent-mode]
    [parinfer.paren-mode :as paren-mode]
    [chromex.support :refer-macros [oget ocall oapply]]
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

(defn update-cursor!
  "Correctly position cursor after text that was just typed.
  We need this since reformatting the text can shift things forward past our cursor."
  [cm change]
  (when (= "+input" (oget change "origin"))
    (let [selection? (ocall cm "somethingSelected")
          text (join "\n" (oget change "text"))
          from-x (oget change "from" "ch")
          line-no (oget change "from" "line")
          line (ocall cm "getLine" line-no)
          insert-x (.indexOf line text from-x)
          after-x (+ insert-x (count text))]
      (cond
        ;; something is selected, don't touch the cursor
        selection?
        nil

        ;; pressing return, keep current position then.
        (= text "\n")
        nil

        ;; only move the semicolon ahead since it can be pushed forward by
        ;; commenting out inferred parens meaning they are immediately
        ;; reinserted behind it.
        (= text ";")
        (ocall cm "setCursor" line-no after-x)

        ;; typed character not found where expected it, we probably prevented it. keep cursor where it was.
        (or (= -1 insert-x)
            (> insert-x from-x))
        (ocall cm "setCursor" line-no from-x)

        :else nil))))

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

(defn compute-cm-change
  [cm change _options prev-state]
  (let [{:keys [start-line end-line num-new-lines]}
        (if change
          {:start-line    (oget change "from" "line")
           :end-line      (inc (oget change "to" "line"))
           :num-new-lines (alength (oget change "text"))}

          (let [start (:cursor-line prev-state)
                end (inc start)]
            {:start-line    start
             :end-line      end
             :num-new-lines (- end start)}))

        lines (for [i (range start-line (+ start-line num-new-lines))]
                (ocall cm "getLine" i))]
    {:line-no  [start-line end-line]
     :new-line lines}))

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

        prev-state (get-prev-state cm)

        ;; format the text
        new-text
        (case mode
          :indent-mode
          (let [result (if (and use-cache? @prev-state)
                         (indent-mode/format-text-change
                           current-text
                           @prev-state
                           (compute-cm-change cm change options @prev-state)
                           options)
                         (indent-mode/format-text current-text options))]
            (when (:valid? result)
              (reset! prev-state (:state result)))
            (:text result))

          :paren-mode
          (let [result (paren-mode/format-text current-text options)]
            (:text result))

          nil)]

    ;; update the text
    (swap! state assoc-in [key- :text] new-text)

    ;; restore the selection, cursor, and scroll
    ;; since these are reset when overwriting codemirror's value.
    (if selection?
      (ocall cm "setSelections" selections)
      (ocall cm "setCursor" cursor))
    (ocall cm "scrollTo" scroll-x scroll-y)))
