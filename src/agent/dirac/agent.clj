(ns dirac.agent
  (:require [clojure.string :as string]))

(defn ^:dynamic dirac-require-failure-msg []
  (str "\n"
       "Dirac failed to require its implementation. This is likely caused by missing or wrong dependencies in your project.\n"
       "Please review your project configuration with Dirac installation instructuctions here: "
       "https://github.com/binaryage/dirac#installation.\n"))

; we want to provide meaningful errors when people forget to include some Dirac dependencies into their projects
; we try require stuff dynamically and make sense of the errors if any
(def ok?
  (try
    (require 'dirac.agent-impl)
    true
    (catch Throwable e
      (let [message (.getMessage e)
            _ (println message)
            groups (re-matches #".*FileNotFoundException: Could not locate (.*).*" message)
            filename (second groups)]
        (if filename
          (let [lib-name (first (string/split filename #"/"))]
            (println (str (dirac-require-failure-msg)
                          "The problem is likely in missing library '" lib-name "' in your dependencies."
                          "Also make sure you are using a recent version.\n")))
          (println (dirac-require-failure-msg) e "\n")))
      false)))

; -- high-level api ---------------------------------------------------------------------------------------------------------

(def current-agent (if ok? (resolve 'dirac.agent-impl/current-agent) (constantly (atom nil))))

(def live? (if ok? (resolve 'dirac.agent-impl/live?) (constantly false)))
(def destroy! (if ok? (resolve 'dirac.agent-impl/destroy!) (constantly false)))
(def create! (if ok? (resolve 'dirac.agent-impl/create!) (constantly false)))
(def boot-now! (if ok? (resolve 'dirac.agent-impl/boot-now!) (constantly false)))

; -- entry point ------------------------------------------------------------------------------------------------------------

(def boot! (if ok? (resolve 'dirac.agent-impl/boot!) (constantly nil)))