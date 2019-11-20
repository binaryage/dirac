(ns dirac.home.chromium.version
  (:require [clojure.java.shell :refer [sh]]
            [clojure.string :as string]
            [dirac.home.helpers :as helpers]))

(defn tokenize-version [version]
  (vec (keep helpers/silent-parse-int (string/split version #"\."))))

(defn compare-tokenized-versions [v1 v2]
  (let [max-count (max (count v1) (count v2))
        padded-v1 (helpers/pad-coll v1 max-count 0)
        padded-v2 (helpers/pad-coll v2 max-count 0)]
    (assert (= (count padded-v1) (count padded-v2)))
    (or (first (drop-while zero? (map compare padded-v1 padded-v2))) 0)))

(defn compare-versions [v1 v2]
  (compare-tokenized-versions (tokenize-version v1) (tokenize-version v2)))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (compare-versions "80.0.3968.0" "81.0.3968.0")                                                                              ; -1
  (compare-versions "80.0.3968.0" "80.2.3968.0")                                                                              ; -1
  (compare-versions "80.0.3968.0" "80.0.3970.0")                                                                              ; -1
  (compare-versions "80.0.3968.0" "80.0.3968.1")                                                                              ; -1
  (compare-versions "80.0.3968.0" "80.0.3968")                                                                                ; 0
  (compare-versions "80.0.3968.0" "80.0.3768")                                                                                ; 1
  )
