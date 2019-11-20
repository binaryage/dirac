(ns dirac.main.terminal
  (:require [clansi]))

(def use-ansi? (volatile! false))

(defn using-ansi? []
  @use-ansi?)

(defn style [& args]
  (if (using-ansi?)
    (apply clansi/style args)
    (first args)))

; it is tricky in Java to determine if we have a TTY on stdout
; https://eklitzke.org/ansi-color-codes
; https://stackoverflow.com/questions/1403772/how-can-i-check-if-a-java-programs-input-output-streams-are-connected-to-a-term
(defn is-a-tty? []
  (some? (System/console)))

(defn setup! [config]
  (let [{:keys [no-color force-color]} config]
    (cond
      (true? no-color) (vreset! use-ansi? false)
      (true? force-color) (vreset! use-ansi? true)
      :default (vreset! use-ansi? (is-a-tty?)))))

(def url-styles [:blue])
(def path-styles [:yellow])
(def version-styles [:cyan])

(defn style-url [s & args]
  (apply style s (concat url-styles args)))

(defn style-path [s & args]
  (apply style s (concat path-styles args)))

(defn style-version [s & args]
  (apply style s (concat version-styles args)))

(defn ask-line! [question]
  (print question)
  (flush)
  (read-line))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (setup! {})
  (setup! {:no-color true})                                                                                                   ; => false
  (setup! {:force-color true})                                                                                                ; => true
  (setup! {:force-color true
           :no-color    true})                                                                                                ; => false
  (style-url "text")
  )
