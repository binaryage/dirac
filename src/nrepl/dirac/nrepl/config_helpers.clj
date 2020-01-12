(ns dirac.nrepl.config-helpers
  (:require [clojure.java.io :as io]
            [clojure.java.shell :refer [sh]]
            [clojure.string :as string])
  (:import (java.io File)))

(def ^:dynamic standard-repl-init-code
  (pr-str
    '(ns cljs.user
       (:require [cljs.repl :refer-macros [source doc find-doc apropos dir pst]]
                 [cljs.pprint :refer [pprint] :refer-macros [pp]]))))

(defn ^:dynamic request-error-message [error-msg]
  (str "--- REQUEST ERROR ---\n"
       error-msg "\n"
       "\n"))

(defmacro with-printing-errors-to-terminal [& body]
  `(let [error# (do ~@body)]
     (when (some? error#)
       (binding [*out* *err*]
         (println (request-error-message error#)))
       error#)))

(defn ^:dynamic default-reveal-url-request-handler! [config url line column]
  (with-printing-errors-to-terminal
    (if-some [script-path (:reveal-url-script-path config)]                                                                    ; nil :reveal-url-script-path should cause a silent failure
      (try
        (let [script ^File (io/as-file script-path)]
          (if-not (.exists script)
            (let [cwd (.getCanonicalPath (clojure.java.io/file "."))]
              (str "The script specified via :reveal-url-script-path does not exist at '" script-path "'.\n"
                   "Current working directory: '" cwd "'"))
            (let [{:keys [exit err out]} (sh script-path url (str line) (str column))]
              (if (= exit 0)
                nil                                                                                                           ; nil means success
                (if (string/blank? err)
                  (str "Script '" script-path "' returned a non-zero exit code: " exit)
                  err)))))
        (catch Throwable e
          (str "Encountered an error when launching :reveal-url-script-path at '" script-path "'.\n"
               "Launched: " "'" script-path "'" " \"" url "\" \"" line "\" \"" column "\"" "\n"
               "Error: " (.getMessage e)))))))
