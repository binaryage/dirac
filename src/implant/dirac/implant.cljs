(ns dirac.implant
  (:require [dirac.dev]
            [dirac.implant.editor :as editor]
            [dirac.implant.intercom :as intercom]
            [chromex.logging :refer-macros [log warn error]]
            [dirac.implant.eval :as eval]))

(def ^:dynamic *initialized* false)

(defn ^:export init []
  (when-not *initialized*
    (set! *initialized* true)
    (intercom/init!)
    (eval/start-eval-request-queue-processing!)))

(defn ^:export init-repl []
  (when-not (intercom/repl-ready?)
    (intercom/connect-to-nrepl-tunnel-server "ws://localhost:9050")))                                                         ; TODO: customize url

(defn ^:export adopt-prompt-element [text-area-element use-parinfer?]
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))

(defn ^:export send-eval-request [request-id code]
  (intercom/send-eval-request! request-id code))