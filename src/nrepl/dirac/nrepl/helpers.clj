(ns dirac.nrepl.helpers
  (:require [dirac.nrepl.version :refer [version]]
            [dirac.logging :as logging]
            [dirac.nrepl.state :as state]
            [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.nrepl.misc :as nrepl-misc])
  (:import (java.util UUID)))

(defmacro with-err-output [& body]
  `(binding [*out* *err*]
     ~@body))

(defn error-println [& args]
  (with-err-output
    (apply println args)))

(defn get-nrepl-info []
  (str "Dirac nREPL middleware v" version))

(defn generate-uuid []
  (str (UUID/randomUUID)))

(defn send-response!
  ([response-msg] (send-response! (state/get-nrepl-message) response-msg))
  ([nrepl-message response-msg]
   (let [transport (:transport nrepl-message)]
     (assert transport)
     (nrepl-transport/send transport (nrepl-misc/response-for nrepl-message response-msg)))))

(defn make-server-side-output-msg [kind content]
  {:pre [(contains? #{:stderr :stdout} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})
