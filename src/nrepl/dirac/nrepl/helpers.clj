(ns dirac.nrepl.helpers
  "Low-level helper methods NOT depending on mutable global state."
  (:require [dirac.nrepl.version :refer [version]]
            [clojure.tools.nrepl.transport :as nrepl-transport]
            [clojure.tools.nrepl.misc :as nrepl-misc]
            [dirac.nrepl.protocol :as protocol])
  (:import (java.util UUID)
           (java.io StringWriter PrintWriter)
           (clojure.lang IExceptionInfo)))

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

(defn send-response! [nrepl-message response-msg]
  (let [transport (:transport nrepl-message)]
    (assert transport)
    (nrepl-transport/send transport (nrepl-misc/response-for nrepl-message response-msg))))

(defn safe-pr-str [value & [level length]]
  (binding [*print-level* (or level 5)
            *print-length* (or length 100)]
    (pr-str value)))

(defn capture-exception-details [e]
  (let [exception-output (StringWriter.)]
    (cond
      (instance? Throwable e) (.printStackTrace e (PrintWriter. exception-output))
      :else (.write exception-output (pr-str e)))
    (str exception-output)))

(defn get-nrepl-message-info [nrepl-message]
  (let [{:keys [op code]} nrepl-message]
    (str "    op: '" op "'" (if (some? code) (str "\n  code: " code)))))

(defn get-exception-details [nrepl-message e]
  (let [details (capture-exception-details e)
        message-info (get-nrepl-message-info nrepl-message)]
    (str message-info "\n\n" details)))

(defn status-coll [message]
  (if-let [status (:status message)]
    (if (coll? status)
      status
      [status])
    []))

(defn javascript-eval-trouble? [e]
  (boolean
    (and (instance? IExceptionInfo e) (#{:js-eval-error :js-eval-exception} (:type (ex-data e))))))

(defn simple-pluralize [n noun]
  (if (= n 1)
    noun
    (str noun "s")))
