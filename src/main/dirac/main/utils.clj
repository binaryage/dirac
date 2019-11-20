(ns dirac.main.utils
  (:require [clojure.pprint :refer [pprint]]
            [clojure.string :as string]
            [clojure.java.io :as io]))

(defn pp [data & [level length]]
  (string/trim (with-out-str
                 (binding [*print-level* (or level 10)                                                                        ; we have to be careful here, data might contain circular references
                           *print-length* (or length 200)
                           clojure.pprint/*print-right-margin* 126]                                                           ; don't limit right margin
                   (pprint data)))))

(defn output* [f config args]
  (assert (map? config))
  (if-not (true? (:quiet config))
    (apply f args)))

(defn output [config & args]
  (output* print config args))

(defn outputln [config & args]
  (output* println config args))

(defn delete-files-recursively! [dir & [silently]]
  (when (.isDirectory (io/file dir))
    (doseq [file (.listFiles (io/file dir))]
      (delete-files-recursively! file silently)))
  (io/delete-file dir silently))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment

  )
