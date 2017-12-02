(ns dirac.implant.editor
  "Glues Parinfer's formatter to a CodeMirror editor"
  (:require [oops.core :refer [oget ocall gcall oapply gget]]))

(defonce basic-editor-opts
  {:mode          "clojure-parinfer"
   :theme         "dirac"
   :matchBrackets true
   :height        "auto"})

(defonce parinfer-editor-opts
  basic-editor-opts)

(defn create-editor! [element key parinfer?]
  (let [element-id (oget element "id")
        cm-class (gget "CodeMirror")
        effective-opts (clj->js (if parinfer? parinfer-editor-opts basic-editor-opts))
        cm (cm-class. element effective-opts)
        wrapper (ocall cm "getWrapperElement")
        class (if parinfer? "cm-x-parinfer" "cm-x-basic")]
    (set! (.-id wrapper) (str "cm-" element-id))
    (set! (.-className wrapper) (str (.-className wrapper) " " class))
    (gcall "parinferCodeMirror.init" cm "smart" effective-opts)
    cm))
