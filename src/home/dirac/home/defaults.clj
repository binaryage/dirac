(ns dirac.home.defaults)

(def dirac-home-dir-name ".dirac")

(def windows-app-locations-env-vars ["LOCALAPPDATA" "PROGRAMFILES" "PROGRAMFILES(X86)"])
(def dirac-home-env-var "DIRAC_HOME")
(def chromium-path-env-var "CHROMIUM_PATH")

(def chromium-dir-name "chromium")                                                                                            ; in dirac home dir

(def chromium-link-name "link")                                                                                               ; in dirac chromium dir
(def chromium-extra-args-name "extra-args.txt")                                                                               ; in dirac chromium dir
(def chromium-profiles-name "profiles")                                                                                       ; in dirac chromium dir

(def releases-file-name "releases.edn")                                                                                       ; in dirac home dir, override by --releases cmd line option in dirac.main
(def releases-file-url "https://raw.githubusercontent.com/binaryage/dirac/master/releases.edn")

(def silo-dir "silo")
(def silo-versions-dir "v")

; https://github.com/binaryage/dirac/releases/download/v1.4.6/dirac-1.4.6.zip
(def dirac-releases-url-prefix "https://github.com/binaryage/dirac/releases/download/")
