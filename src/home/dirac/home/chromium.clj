(ns dirac.home.chromium
  (:require [dirac.home.chromium.scout :as scout]
            [dirac.home.chromium.link :as link]
            [dirac.home.chromium.profiles :as profiles]
            [dirac.home.defaults :as defaults]
            [dirac.home.chromium.extra-args :as extra-args]
            [dirac.home.chromium.mapping :as mapping]
            [dirac.home.locations :as locations]))

(def find-chrome-executable scout/find-chrome-executable)
(def determine-chrome-version scout/determine-chrome-version)

(def chromium-link-exists? link/chromium-link-exists?)
(def resolve-chromium-link link/resolve-chromium-link)

(def resolve-dirac-release! mapping/resolve-dirac-release!)
(def try-download-releases-file-if-needed! mapping/try-download-releases-file-if-needed!)

(def get-chromium-profile-dir-path profiles/get-chromium-profile-dir-path)

(def read-chromium-extra-args extra-args/read-chromium-extra-args)

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (find-chrome-executable)
  (determine-chrome-version (find-chrome-executable))
  (resolve-dirac-release! "81.1.4014.0" defaults/releases-file-url (locations/get-releases-file-path))
  (read-chromium-extra-args)
  )
