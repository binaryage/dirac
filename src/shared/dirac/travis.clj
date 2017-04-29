(ns dirac.travis
  (:require [cuerdas.core :as cuerdas])
  (:import (java.time Instant)))

(def ANSI_CLEAR "\033[0K")
(def CLEAR_LINE (str "\r" ANSI_CLEAR))

; -- raw commands -----------------------------------------------------------------------------------------------------------

(defn travis-fold-command [action name]
  (str "travis_fold:" action ":" name CLEAR_LINE))

(defn travis-start-time-command [timer-id]
  (str "travis_time:"
       "start:" timer-id
       CLEAR_LINE))

(defn travis-end-time-command [timer-id start-time end-time]
  (str "\n"
       "travis_time:"
       "end:" timer-id ":"
       "start=" start-time ",finish=" end-time ",duration=" (- end-time start-time)
       CLEAR_LINE))

; -- wrappers ---------------------------------------------------------------------------------------------------------------

(defn wrap-with-timing [forms]
  (let [timer-id (name (gensym "timer"))]
    `(let [start-time# (.getNano (Instant/now))]
       (print (travis-start-time-command ~timer-id))
       (try
         ~@forms
         (finally
           (let [end-time# (.getNano (Instant/now))]
             (print (travis-end-time-command ~timer-id start-time# end-time#))))))))

(defn wrap-with-folding [title name forms]
  `(let [sanitized-name# (cuerdas/kebab ~name)]
     (print (travis-fold-command "start" sanitized-name#))
     (println ~title)
     (try
       ~@forms
       (finally
         (print (travis-fold-command "end" sanitized-name#))))))

; -- public api -------------------------------------------------------------------------------------------------------------

(defmacro with-travis-fold [title name & body]
  (wrap-with-timing
    (list (wrap-with-folding title name body))))
