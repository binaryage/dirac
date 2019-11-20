(ns dirac.home.releases
  (:require [clojure.java.io :as io]
            [dirac.home.helpers :as helpers]
            [dirac.home.locations :as locations]
            [dirac.home.defaults :as defaults]))

(def get-versions-dir-path locations/get-versions-dir-path)
(def get-version-dir-path locations/get-version-dir-path)
(def get-devtools-frontend-dir-path locations/get-devtools-frontend-dir-path)

(defn get-release-url [version]
  ; => example url https://github.com/binaryage/dirac/releases/download/v1.4.6/dirac-1.4.6.zip
  (str defaults/dirac-releases-url-prefix "v" version "/dirac-" version ".zip"))

(defn retrieve-release!
  ([version]
   (retrieve-release! version (fn [_progress & [_total]])))
  ([version reporter]
   (let [url (get-release-url version)
         dir (get-version-dir-path version)]
     (helpers/download-and-unzip! url dir {:progress-callback reporter}))))

(defn list-releases []
  (vec (sort (.list (io/file (get-versions-dir-path))))))

(defn release-downloaded? [version]
  (some? (some #{version} (list-releases))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (get-root-dir)
  (get-versions-dir-path)
  (get-version-dir-path "1.2.3")
  (get-release-url "1.2.3")
  (retrieve-release! "1.4.5")
  (retrieve-release! "1.4.6" (make-progress-reporter))
  (retrieve-release! "1.4.not-found" (make-progress-reporter))
  (list-releases)
  (release-downloaded? "1.4.5")
  )
