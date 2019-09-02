#!/usr/bin/env lumo

; this is an example fuzzy matcher to open devtools urls via nREPL

(ns fuzzy.finder
  (:require [lumo.core :refer [*command-line-args*]]
            [clojure.string :as string]))

; -- node requires ----------------------------------------------------------------------------------------------------------

(def url-api (js/require "url"))
(def fs-api (js/require "fs"))
(def child-process-api (js/require "child_process"))

; -- config -----------------------------------------------------------------------------------------------------------------

; TODO: make this configurable externally?
(def search-dirs ["src" "resources/public"])                                                                                  ; folders will be searched in this order

; -- utils ------------------------------------------------------------------------------------------------------------------

(defn coerce-buffer-to-string [buffer & [encoding]]
  (if (js/Buffer.isBuffer buffer)
    (.toString buffer (or encoding "utf-8"))
    (.toString buffer)))

(defn print-err [& args]
  (binding [*print-fn* *print-err-fn*]
    (apply println args)))

(defn list-dir [dir]
  (let [items (map #(str dir "/" %) (.readdirSync fs-api dir))
        * (fn [item]
            (let [stat (.lstatSync fs-api item)]
              (if (.isDirectory stat)
                (list-dir item)
                [item])))]
    (mapcat * items)))

(defn path-segments [path]
  (filter (complement empty?) (string/split path "/")))

(defn strip-extra-nil-args [args]
  (reverse (drop-while nil? (reverse args))))

(defn call-spawn-api! [& args]
  (let [sanitized-args (strip-extra-nil-args args)]                                                                           ; node API is strict about extra nil args
    (.apply (.-spawnSync child-process-api) child-process-api (into-array sanitized-args))))

(defn spawn! [cmd & [args opts]]
  (let [result (call-spawn-api! cmd (into-array args) opts)
        stdout (.-stdout result)
        stderr (.-stderr result)
        status (.-status result)]
    (if stdout
      (println (coerce-buffer-to-string stdout)))
    (if stderr
      (print-err (coerce-buffer-to-string stderr)))
    status))

; -- fuzzy search for best match --------------------------------------------------------------------------------------------

(defn filter-files-by-filename [files filename]
  (let [postfix (str "/" filename)]
    (filter #(string/ends-with? % postfix) files)))

(defn compute-score [reversed-candidate reversed-ideal]
  (count (take-while true? (map = reversed-candidate reversed-ideal))))

(defn compute-file-score [reversed-ideal file]
  (let [score (compute-score (reverse (path-segments file)) reversed-ideal)]
    [file score]))

(defn compare-files-scores [file-score1 file-score2]
  (compare (second file-score1) (second file-score2)))

(defn compute-score-table [files ideal]
  (let [reversed-ideal (reverse ideal)
        table (map (partial compute-file-score reversed-ideal) files)]
    (reverse (sort compare-files-scores table))))

(defn find-best-candidate [file-path dir]
  (let [file-segments (path-segments file-path)
        filename (last file-segments)
        all-files (list-dir dir)
        candidate-files (filter-files-by-filename all-files filename)
        score-table (compute-score-table candidate-files file-segments)
        best-candidate (first score-table)]
    best-candidate))

(defn strong-candidate? [file-score]
  (> (second file-score) 1))

(defn select-matching-file-for-url [file-url]
  (let [parsed-url (.parse url-api file-url)
        file-path (.-pathname parsed-url)
        best-candidates (keep (partial find-best-candidate file-path) search-dirs)                                            ; for each search-dir find the best candidate
        strong-candidates (filter strong-candidate? best-candidates)                                                          ; take only candidates with score > 1 (thanks to clojure's convention assume we have at least 2-segment namespaces)
        winner (first (first strong-candidates))]
    winner))

; -- opening files ----------------------------------------------------------------------------------------------------------

(defmulti open-file! (fn [tool & _args] (keyword tool)))

(defmethod open-file! :idea [_ path line _column]
  (let [file+line (str path ":" line)]
    (spawn! "idea" [file+line])))

; -- main work --------------------------------------------------------------------------------------------------------------

(defn work! [& [file-url line column]]
  (if-let [matching-file (select-matching-file-for-url file-url)]
    (do
      (println (str "Requested url: " file-url "\n"
                    "Matching file: '" matching-file "'"))
      (open-file! :idea matching-file line column))
    (do
      (print-err (str "No matching file found for url: " file-url))
      1)))

(defn main! [args]
  (try
    (apply work! args)
    (catch :default e
      (print-err (str "Exception: " (.-message e) "\n" (.-stack e)))
      101)))

; -- entry point ------------------------------------------------------------------------------------------------------------

(js/process.exit (main! *command-line-args*))
