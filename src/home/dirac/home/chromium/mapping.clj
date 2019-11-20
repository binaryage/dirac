(ns dirac.home.chromium.mapping
  (:require [clojure.java.io :as io]
            [dirac.home.helpers :as helpers]
            [dirac.home.locations :as locations]
            [dirac.home.chromium.version :as version]
            [clojure.tools.logging :as log]
            [dirac.home.defaults :as defaults])
  (:import (java.io FileNotFoundException)))

(def ^:dynamic *mock-releases*)

(def get-releases-file-path locations/get-releases-file-path)

(defn read-releases-file [file]
  (if (bound? #'*mock-releases*)
    *mock-releases*
    (helpers/read-edn file)))

(defn lookup-dirac-release [chromium-mapping chromium-version]
  (let [version-keys (filter string? (keys chromium-mapping))
        sorted-version-keys (sort version/compare-versions version-keys)
        match? (fn [v] (not= (version/compare-versions chromium-version v) -1))
        resolved-version (last (filter match? sorted-version-keys))]
    (if (some? resolved-version)
      (get chromium-mapping resolved-version)
      (get chromium-mapping :unsupported))))

; -- public API -------------------------------------------------------------------------------------------------------------

(defn try-download-releases-file-if-needed! [releases-file-url releases-file-path]
  (when-not (bound? #'*mock-releases*)
    (try
      ; TODO: implement Etag or caching
      (helpers/download! releases-file-url releases-file-path)
      (catch FileNotFoundException e
        (log/info (str "Unable to download '" releases-file-url "':\n" e))
        (if (.exists (io/file releases-file-path))
          (log/info (str "Using on-disk version from '" releases-file-path "' which might be outdated.")))))))

(defn resolve-dirac-release!
  ([chromium-version url releases-file-path]
   (try-download-releases-file-if-needed! url releases-file-path)
   (resolve-dirac-release! chromium-version releases-file-path))
  ([chromium-version releases-file]
   (let [releases (read-releases-file releases-file)
         chromium-mapping (:chromium releases)
         _ (assert chromium-mapping)
         release-descriptor (lookup-dirac-release chromium-mapping chromium-version)]
     (if (string? release-descriptor)
       release-descriptor
       (throw (ex-info (str "Unable to retrieve Dirac release for Chromium " chromium-version ".\n"
                            "Reason: " (:message release-descriptor))
                       {:chromium-version   chromium-version
                        :release-descriptor release-descriptor}))))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (get-releases-file-path)
  (try-download-releases-file-if-needed! defaults/releases-file-url (get-releases-file-path))
  (read-releases-file (get-releases-file-path))
  (let [mapping {"81.1.4014.0" "1.5.0"
                 "81.0.4014.3" "1.4.7"
                 "81.0.4014.1" "1.4.6"
                 "81.0.4013.0" "1.4.5"
                 :unsupported  {:message "This chromium version is not supported."}}]
    [(lookup-dirac-release mapping "82.1.4010")                                                                               ; => "1.5.0"
     (lookup-dirac-release mapping "81.1.4014")                                                                               ; => "1.5.0"
     (lookup-dirac-release mapping "81.0.4016")                                                                               ; => "1.4.7"
     (lookup-dirac-release mapping "81.0.4014.6")                                                                             ; => "1.4.7"
     (lookup-dirac-release mapping "81.0.4014.3")                                                                             ; => "1.4.7"
     (lookup-dirac-release mapping "81.0.4014.2")                                                                             ; => "1.4.6"
     (lookup-dirac-release mapping "81.0.4014.1")                                                                             ; => "1.4.6"
     (lookup-dirac-release mapping "81.0.4013.1")                                                                             ; => "1.4.5"
     (lookup-dirac-release mapping "81.0.4012.0")]                                                                            ; => :message
    )
  (binding [*mock-releases* {:chromium {"81.0.4014.0" "1.2.3"}}]
    (resolve-dirac-release! "81.0.4014.1"))
  (binding [*mock-releases* {:chromium {"81.0.4014.0" "1.2.3"
                                        :unsupported  {:message "NOT SUPPORTED"}}}]
    (resolve-dirac-release! "81.0.4010.0"))

  )
