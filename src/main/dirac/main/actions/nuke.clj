(ns dirac.main.actions.nuke
  (:require [dirac.home.locations :as locations]
            [dirac.main.terminal :as terminal]
            [dirac.main.utils :as utils]
            [clojure.string :as string]
            [clojure.tools.logging :as log]
            [clojure.java.io :as io]))

(defn should-ask? [config]
  (let [{:keys [quiet]} config]
    (and (terminal/is-a-tty?)
         (not (true? quiet)))))

(defn maybe-ask-for-confirmation! [config question default-answer]
  (if-not (should-ask? config)
    default-answer
    (let [answer (string/lower-case (terminal/ask-line! question))
          effective-answer (if (string/blank? answer) default-answer answer)]
      effective-answer)))

(defn nuke!
  "Reset Dirac into factory defaults:

   1. delete Dirac HOME directory
  "
  [config]
  (let [home-dir-path (locations/get-home-dir-path)
        question (str "I'm about to delete Dirac home dir '" (terminal/style-path home-dir-path) "'. Are you sure? [Y/n]")]
    (when (.exists (io/file home-dir-path))
      (if (= (maybe-ask-for-confirmation! config question "y") "y")
        (do
          (log/info (str "Deleting '" (terminal/style-path home-dir-path) "'..."))
          (utils/delete-files-recursively! home-dir-path)
          (log/info (str "Done")))
        (log/info "Cancelled")))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  )
