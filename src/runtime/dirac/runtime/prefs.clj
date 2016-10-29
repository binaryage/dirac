(ns dirac.runtime.prefs
  (:require [clojure.string :as string]
            [dirac.lib.utils :as utils])
  (:import (java.io File)))

(defn attempt-to-read-runtime-tag-from-project-settings []
  ; note: this works only in dev mode (when project is not packaged as jar)
  ; if we don't succeed it is not that big deal, runtime tags are only "nice to have" feature
  ; they are relevant to auto-joining dirac REPL sessions
  (try
    (if-let [project (slurp "project.clj")]
      (if-let [match (re-find #"^\(defproject (.*?) " project)]
        (str (second match))))
    (catch Throwable _e
      nil)))

(defn attempt-to-read-runtime-tag-from-project-folder []
  (try
    (let [folder-name (.getName (.getCanonicalFile (File. ".")))]
      (if-not (string/blank? folder-name)
        folder-name))
    (catch Throwable _e
      nil)))

(defn attempt-to-determine-runtime-tag []
  (or (attempt-to-read-runtime-tag-from-project-settings)
      (attempt-to-read-runtime-tag-from-project-folder)))

(def env-config-prefix "dirac-runtime")

(defmacro gen-static-config []
  (let [env-config (utils/read-env-config env-config-prefix)
        runtime-tag-config {:runtime-tag (attempt-to-determine-runtime-tag)}]
    (utils/deep-merge-ignoring-nils {} runtime-tag-config env-config)))
