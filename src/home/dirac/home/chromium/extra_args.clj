(ns dirac.home.chromium.extra-args
  (:require [dirac.home.helpers :as helpers]
            [dirac.home.locations :as locations]
            [clojure.java.io :as io])
  (:import (java.io File)))

(def get-chromium-extra-args-file-path locations/get-chromium-extra-args-file-path)

(defn read-chromium-extra-args
  ([] (read-chromium-extra-args (get-chromium-extra-args-file-path)))
  ([^File file]
   (let [file (io/file file)]
     (if (.exists file)
       (-> file
           (helpers/read-trimmed-lines)
           (helpers/filter-commented-lines))))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (get-chromium-extra-args-file-path)
  (read-chromium-extra-args)
  )
