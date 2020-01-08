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

(def min-home-dir-path-length 7)

(defn validate-home-dir [path]
  ; for safety reasons we validate home-dir path to satisfy some checks
  (cond
    (nil? path) (throw (ex-info "Unable to determine Dirac home directory" {:path path}))
    (not (string? path)) (throw (ex-info "Unexpected: Dirac home directory must be a string" {:path path}))
    (<= (count path) min-home-dir-path-length) (throw (ex-info "Unexpected: Dirac home directory path is too short"
                                                               {:path  path
                                                                :limit min-home-dir-path-length}))
    (not (.isAbsolute (io/file path))) (throw (ex-info "Unexpected: Dirac home directory must be an absolute path"
                                                       {:path path})))
  path)

(defn resolve-home-dir []
  (or (resolve-env-specified-home-dir)
      (resolve-default-home-dir)))

; -- paths ------------------------------------------------------------------------------------------------------------------

(defn get-home-dir-path []
  (or @cached-home-dir-atom (reset! cached-home-dir-atom (validate-home-dir (resolve-home-dir)))))

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

  (validate-home-dir nil)
  (validate-home-dir {})
  (validate-home-dir "/")
  (validate-home-dir "xxx/yyy")
  (validate-home-dir "xxx/yyy/zzz")
  (validate-home-dir "/xxx/yyy/zzz")

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
