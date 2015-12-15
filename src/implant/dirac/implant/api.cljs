(ns dirac.implant.api
  (:require [dirac.implant.editor :as editor]))

(defn ^:export adopt-prompt-element [text-area-element]
  (let [editor (editor/create-editor! text-area-element :prompt)]
    (editor/start-editor-sync!)
    editor))