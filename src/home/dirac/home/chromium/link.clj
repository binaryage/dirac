(ns dirac.home.chromium.link
  (:require [clojure.java.io :as io]
            [clojure.string :as string]
            [dirac.home.helpers :as helpers]
            [dirac.home.locations :as locations]))

(def get-chromium-link-path locations/get-chromium-link-path)

(defn prepare-followed-paths-chain [paths]
  (string/join " -> " paths))

(defn explain-followed-paths [paths]
  (let [chain (prepare-followed-paths-chain paths)]
    (if-not (string/blank? chain)
      (str " Followed paths: '" chain "'."))))

; for users without filesystem links we support text files simulating links
(defn follow-text-file-link [file]
  (let [target-path (helpers/read-and-trim-first-line file)
        target-file (io/file target-path)]
    (if (.isAbsolute target-file)
      (.getPath target-file)
      (let [parent-dir (.getParent file)
            target-file (io/file parent-dir target-path)]
        (.getPath target-file)))))

(defn resolve-link
  "Try to resolve default chromium link file (or provided file) by following symlinks or textual links recursively.
   Stops when it finds an executable and returns {:executable [absolute-path]}.
   In case of a failure returns textual description {:failure [text]}.
  "
  ([file-path] (resolve-link file-path []))
  ([file-path followed-paths]
   (try
     (let [file (io/file file-path)]
       (if-not (.exists file)
         (let [paths (dedupe followed-paths)]
           {:failure (str "File path '" (.getPath file) "' does not exist." (explain-followed-paths paths))
            :paths   (dedupe (conj paths (.getPath file)))})
         (let [resolved-file (.getCanonicalFile file)]
           (if-not (.exists resolved-file)
             (let [paths (dedupe (conj followed-paths (.getPath file)))]
               {:failure (str "File path '" (.getPath resolved-file) "' does not exist." (explain-followed-paths paths))
                :paths   (dedupe (conj paths (.getPath resolved-file)))})
             (let [paths (concat followed-paths [(.getPath file) (.getPath resolved-file)])]
               (if (.canExecute resolved-file)
                 {:executable (.getAbsolutePath resolved-file)
                  :paths      (dedupe paths)}
                 (resolve-link (follow-text-file-link resolved-file) paths)))))))
     (catch Exception e
       {:failure (str "Exception: " (.getMessage e))}))))

(defn resolve-chromium-link
  ([] (resolve-chromium-link (get-chromium-link-path)))
  ([chromium-file]
   (resolve-link chromium-file)))

(defn chromium-link-exists? []
  (.exists (io/file (get-chromium-link-path))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (resolve-chromium-link)
  (chromium-link-exists?)
  (read-and-trim-first-line (io/file *file*))
  )

