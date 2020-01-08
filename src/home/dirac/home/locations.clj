(ns dirac.home.locations
  (:require [clojure.java.io :as io]
            [dirac.home.defaults :as defaults]
            [dirac.home.helpers :as helpers])
  (:import (java.io File)))

(def cached-home-dir-atom (atom nil))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn canonical-path [& args]
  (.getCanonicalPath ^File (apply io/file (flatten args))))

(defn resolve-default-home-dir []
  (let [user-home-dir (helpers/system-get-property "user.home")]
    (assert user-home-dir)
    (canonical-path user-home-dir defaults/dirac-home-dir-name)))

(defn resolve-env-specified-home-dir []
  (if-some [dirac-home (helpers/system-get-env defaults/dirac-home-env-var)]
    (canonical-path dirac-home)))

(defn resolve-home-dir []
  (or (resolve-env-specified-home-dir)
      (resolve-default-home-dir)))

; -- paths ------------------------------------------------------------------------------------------------------------------

(defn get-home-dir-path []
  (or @cached-home-dir-atom (reset! cached-home-dir-atom (resolve-home-dir))))

(defn get-chromium-dir-path []
  (canonical-path (get-home-dir-path) defaults/chromium-dir-name))

(defn get-chromium-profiles-dir-path []
  (canonical-path (get-chromium-dir-path) defaults/chromium-profiles-name))

(defn get-chromium-link-path []
  (canonical-path (get-chromium-dir-path) defaults/chromium-link-name))

(defn get-chromium-extra-args-file-path []
  (canonical-path (get-chromium-dir-path) defaults/chromium-extra-args-name))

(defn get-releases-file-path []
  (canonical-path (get-home-dir-path) defaults/releases-file-name))

(defn get-silo-dir-path []
  (canonical-path (get-home-dir-path) defaults/silo-dir))

(defn get-versions-dir-path []
  (canonical-path (get-silo-dir-path) defaults/silo-versions-dir))

(defn get-version-dir-path [version]
  (canonical-path (get-versions-dir-path) version))

(defn get-devtools-frontend-dir-path [version-dir]
  (canonical-path version-dir "devtools" "front_end"))

(defn get-playground-dir-path []
  (canonical-path (get-home-dir-path) defaults/playground-dir))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (resolve-default-home-dir)
  (binding [helpers/*system-get-property-impl* (fn [name]
                                                 (case name
                                                   "user.home" "/tmp/home"))]
    (resolve-default-home-dir))

  (resolve-env-specified-home-dir)
  (binding [helpers/*system-get-env-impl* (fn [name]
                                            (case name
                                              "DIRAC_HOME" "/tmp/home/dirac"))]
    (resolve-env-specified-home-dir))

  (resolve-home-dir)

  (absolutize-path-to-home "test.txt")
  (absolutize-path-to-home "../test.txt")

  ; ----
  (get-home-dir-path)
  (get-chromium-dir-path)
  (get-chromium-profiles-dir-path)
  (get-chromium-link-path)
  (get-chromium-extra-args-file-path)
  (get-releases-file-path)
  (get-silo-dir-path)
  (get-versions-dir-path)
  (get-version-dir-path "1.2.3")
  (get-playground-dir-path)
  )
