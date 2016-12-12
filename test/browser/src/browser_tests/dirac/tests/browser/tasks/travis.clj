(ns dirac.tests.browser.tasks.travis
  (:require [cuerdas.core :as cuerdas]))

(def ANSI_CLEAR "\033[0K")

(defn travis-fold-command [action name]
  (str "travis_fold:" action ":" name "\r" ANSI_CLEAR))

(defmacro with-travis-fold [title name & body]
  (let [sanitized-name (cuerdas/kebab name)
        fold-start (travis-fold-command "start" sanitized-name)
        fold-end (travis-fold-command "end" sanitized-name)]
    `(do
       (print ~fold-start)
       (println ~title)
       (try
         ~@body
         (finally
           (print ~fold-end)                                                                                                  ; for some reason print does not work without following println, I assume it is some java buffering magic
           (println))))))
