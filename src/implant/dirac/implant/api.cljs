(ns dirac.implant.api
  (:require [dirac.implant.editor :as editor]))

(defn ^:export adopt-prompt-element [text-area-element use-parinfer?]
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))