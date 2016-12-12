(ns dirac.tests.browser.tasks.travis)

(def ANSI_CLEAR "\033[0K")

(defn travis-fold-command [action name]
  (str "travis_fold:" action ":" name "\r" ANSI_CLEAR))

(defmacro with-travis-fold [name & body]
  `(do
     (print (travis-fold-command "start" name))
     (try
       ~@body
       (finally
         (print (travis-fold-command "end" name))))))
