; taken from https://github.com/shaunlebron/parinfer
(ns dirac.implant.editor
  "Glues Parinfer's formatter to a CodeMirror editor"
  (:require
    [clojure.string :refer [join]]
    [chromex.support :refer-macros [oget ocall oapply]]
    [dirac.implant.state :refer [state empty-editor-state]]
    [dirac.implant.support :refer [update-cursor! fix-text! cm-key IEditor get-prev-state frame-updated? set-frame-updated!]]))

;;----------------------------------------------------------------------
;; Life Cycle events
;;----------------------------------------------------------------------

;; NOTE:
;; Text is either updated after a change in text or
;; a cursor movement, but not both.
;;
;; When typing, on-change is called, then on-cursor-activity.
;; So we prevent updating the text twice by using an update flag.

(def frame-updates (atom {}))

(defn before-change
  "Called before any change is applied to the editor."
  [cm change]
  ;; keep CodeMirror from reacting to a change from "setValue"
  ;; if it is not a new value.
  (when (and (= "setValue" (oget change "origin"))
             (= (ocall cm "getValue") (join "\n" (oget change "text"))))
    (ocall change "cancel")))

(defn on-change
  "Called after any change is applied to the editor."
  [cm change]
  (when (not= "setValue" (oget change "origin"))
    (fix-text! cm :change change)
    (update-cursor! cm change)
    (set-frame-updated! cm true)))

(defn on-cursor-activity
  "Called after the cursor moves in the editor."
  [cm]
  (when-not (frame-updated? cm)
    (fix-text! cm))
  (set-frame-updated! cm false))

(defn on-tab
  "Indent selection or insert two spaces when tab is pressed.
  from: https://github.com/codemirror/CodeMirror/issues/988#issuecomment-14921785"
  [cm]
  (if (ocall cm "somethingSelected")
    (ocall cm "indentSelection")
    (let [n (ocall cm "getOption" "indentUnit")
          spaces (apply str (repeat n " "))]
      (ocall cm "replaceSelection" spaces))))

;;----------------------------------------------------------------------
;; Setup
;;----------------------------------------------------------------------

(def basic-editor-opts
  {:mode          "clojure-parinfer"
   :theme         "dirac"
   :matchBrackets true
   :height        "auto"
   :extraKeys     {"Shift-Tab"   "indentLess"
                   "Shift-Enter" "newlineAndIndent"
                   "Alt-Enter"   "newlineAndIndent"
                   "Ctrl-Enter"  "newlineAndIndent"}})

(def parinfer-editor-opts
  (merge basic-editor-opts
         {:extraKeys {"Tab" on-tab}}))

(defn create-editor! [element key parinfer?]
  (when-not (get @state key)
    (let [element-id (oget element "id")
          cm-class (oget js/window "CodeMirror")
          effective-opts (if parinfer? parinfer-editor-opts basic-editor-opts)
          cm (cm-class. element (clj->js effective-opts))
          wrapper (ocall cm "getWrapperElement")
          initial-state empty-editor-state
          prev-editor-state (atom nil)
          class (if parinfer? "cm-x-parinfer" "cm-x-basic")]

      (set! (.-id wrapper) (str "cm-" element-id))
      (set! (.-className wrapper) (str (.-className wrapper) " " class))

      (when-not (get @state key)
        (swap! frame-updates assoc key {}))

      (swap! state update key
             #(-> (or % initial-state)
                  (assoc :cm cm)))

      (when parinfer?
        ;; Extend the code mirror object with some utility methods.
        (specify! cm
          IEditor
          (get-prev-state [_this] prev-editor-state)
          (cm-key [_this] key)
          (frame-updated? [_this] (get-in @frame-updates [key :frame-updated?]))
          (set-frame-updated! [_this value] (swap! frame-updates assoc-in [key :frame-updated?] value)))

        ;; handle code mirror events
        (ocall cm "on" "change" on-change)
        (ocall cm "on" "beforeChange" before-change)
        (ocall cm "on" "cursorActivity" on-cursor-activity))

      cm)))

;;----------------------------------------------------------------------
;; Setup
;;----------------------------------------------------------------------

(defn on-state-change
  "Called everytime the state changes to sync the code editor."
  [_ _ _ new-state]
  (doseq [[_ {:keys [cm text]}] new-state]
    (let [changed? (not= text (ocall cm "getValue"))]
      (when changed?
        (ocall cm "setValue" text)))))

(defn force-editor-sync! []
  (doseq [[_ {:keys [cm text]}] @state]
    (ocall cm "setValue" text)))

;; sync state changes to the editor
(defn start-editor-sync! []
  (add-watch state :editor-updater on-state-change)
  (force-editor-sync!))