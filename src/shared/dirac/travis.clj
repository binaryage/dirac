(ns dirac.travis
  (:require [cuerdas.core :as cuerdas]))

(def ANSI_CLEAR "\033[0K")

(defn travis-fold-command [action name]
  (str "travis_fold:" action ":" name "\r" ANSI_CLEAR))

(defmacro with-travis-fold [title name & body]
  `(let [sanitized-name# (cuerdas/kebab ~name)]
     (print (travis-fold-command "start" sanitized-name#))
     (println ~title)
     (try
       ~@body
       (finally
         (print (travis-fold-command "end" sanitized-name#))))))
