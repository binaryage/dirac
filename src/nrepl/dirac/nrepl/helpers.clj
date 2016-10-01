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

(defn make-human-readable-list [coll]
  (let [strings (map pr-str coll)]
    (case (count strings)
      0 "(empty list)"
      1 (first strings)
      (str (apply str (interpose ", " (butlast strings))) " and " (last strings)))))

(defn make-human-readable-selected-compiler [selected-compiler]
  (cond
    (nil? selected-compiler) "nil (any available)"
    (number? selected-compiler) (str "#" selected-compiler)
    :else (pr-str selected-compiler)))

(defn send-response!
  ([response-msg] (send-response! (state/get-nrepl-message) response-msg))
  ([nrepl-message response-msg]
   (let [transport (:transport nrepl-message)]
     (assert transport)
     (nrepl-transport/send transport (nrepl-misc/response-for nrepl-message response-msg)))))

(defn make-server-side-output-msg [kind content]
  {:pre [(contains? #{:stderr :stdout :java-trace} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})

(defn safe-pr-str [value & [level length]]
  (binding [*print-level* (or level 5)
            *print-length* (or length 100)]
    (pr-str value)))

