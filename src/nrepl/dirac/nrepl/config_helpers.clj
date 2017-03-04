(ns dirac.nrepl.config-helpers
  (:require [dirac.lib.utils :refer [read-env-config deep-merge-ignoring-nils]]
            [clojure.java.shell :refer [sh]]
            [clojure.java.io :as io]
            [clojure.string :as string])
  (:import (java.io File)))

(def ^:dynamic standard-repl-init-code
  (pr-str
    '(ns cljs.user
       (:require [cljs.repl :refer-macros [source doc find-doc apropos dir pst]]
                 [cljs.pprint :refer [pprint] :refer-macros [pp]]))))

(defmacro with-printing-errors-to-terminal [& body]
  `(let [res# (do ~@body)]
     (when (some? res#)
       (println (str "--- REQUEST ERROR ---\n"
                     res# "\n"
                     "\n"))
       res#)))

(defn ^:dynamic default-reveal-url-request-handler! [config url line column]
  (with-printing-errors-to-terminal
    (if-let [script-path (:reveal-url-script-path config)]                                                                    ; nil :reveal-url-script-path should cause a silent failure
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
                  (str "Script " script-path " returned non-zero exit code: " exit)
                  err)))))
        (catch Throwable e
          (str "Encountered en error when launching :reveal-url-script-path at '" script-path "'.\n"
               "Launched: " (str "'" script-path "'" " \"" url "\" \"" line "\" \"" column "\"") "\n"
               "Error: " (.getMessage e)))))))
