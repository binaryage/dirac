(ns dirac.home.chromium-test
  (:require [clojure.test :refer :all]
            [clojure.java.io :as io]
            [matcher-combinators.test :refer :all]
            [matcher-combinators.matchers :as m]
            [dirac.home.chromium :refer [resolve-chromium-link]]
            [dirac.home.helpers :as helpers])
  (:import (java.io File)))

(defn this-file []
  (let [file (io/file *file*)
        file (if (.exists file)
               file
               (ClassLoader/getSystemResource *file*))]
    (.getCanonicalPath ^File file)))

(defn get-playground-dir-from-env []
  (helpers/system-get-env "DIRAC_TEST_PLAYGROUND"))

(defn get-playground-dir-relative []
  (let [this-dir (.getParent (io/file (this-file)))]
    (.getCanonicalPath (io/file this-dir ".." ".." "playground"))))

(defn get-playground-dir []
  (or (get-playground-dir-from-env)
      (get-playground-dir-relative)))

(deftest resolve-chromium-link-test
  (let [playground-dir (io/file (get-playground-dir) "chromium-home")]
    (are [f m]
      (match? m (resolve-chromium-link (io/file playground-dir f)))
      "non-existent" {:failure #"chromium-home/non-existent' does not exist"}
      "chromium-link1" {:executable #"chromium-home/bin/executable\.sh$"}
      "chromium-link2" {:executable #"chromium-home/bin/executable\.sh$"}
      "chromium-link3" {:executable #"chromium-home/bin/executable\.sh$"}
      "chromium-link4" {:executable #"chromium-home/bin/executable\.sh$"}
      "chromium-link5" {:executable #"chromium-home/bin/executable\.sh$"}
      "chromium-link-broken" {:failure #"chromium-home/chromium-link-broken' does not exist"}
      "chromium-text-link-broken" {:failure #"bin/non-existent-file' does not exist. Followed paths:"})))

(comment
  (run-tests)
  *file*
  (ClassLoader/getSystemResource *file*)
  (get-playground-dir))
