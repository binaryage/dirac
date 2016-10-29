(ns dirac.nrepl.config
  (:require [dirac.lib.utils :refer [assoc-env-val deep-merge-ignoring-nils]]
            [clojure.tools.nrepl :as nrepl]))

(def ^:dynamic standard-repl-init-code
  (nrepl/code
    (ns cljs.user
      (:require [cljs.repl :refer-macros [source doc find-doc apropos dir pst]]
                [cljs.pprint :refer [pprint] :refer-macros [pp]]))))

(def default-config
  {:log-out            :console                                                                                               ; this is important, nREPL middleware captures output and logs be sent to client
   :log-level          "WARN"                                                                                                 ; OFF, FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL
   :skip-logging-setup false
   :weasel-repl        {:host  "localhost"
                        :port  8232
                        :range 10}                                                                                            ; how many ports to try if the default port is taken
   ; dirac/sticky means we will inherit preferred compiler from old session on browser refresh
   :preferred-compiler "dirac/sticky"                                                                                         ; or "dirac/new", or compiler matching strategy
   :cljs-repl-options  nil
   :repl-init-code     standard-repl-init-code
   :runtime-tag        "unidentified"})

; -- environment ------------------------------------------------------------------------------------------------------------

(defn get-environ-config []
  (-> {}
      (assoc-env-val [:log-level] :dirac-nrepl-log-level)
      (assoc-env-val [:log-out] :dirac-nrepl-log-out)
      (assoc-env-val [:skip-logging-setup] :dirac-nrepl-skip-logging-setup :bool)
      (assoc-env-val [:preferred-compiler] :dirac-nrepl-preferred-compiler)
      (assoc-env-val [:weasel-repl :host] :dirac-nrepl-weasel-host)
      (assoc-env-val [:weasel-repl :port] :dirac-nrepl-weasel-port :int)
      (assoc-env-val [:weasel-repl :range] :dirac-nrepl-weasel-range :int)))

; -- config evaluation ------------------------------------------------------------------------------------------------------

(defn get-effective-config* [& [config]]
  (let [environ-config (get-environ-config)]
    (or (deep-merge-ignoring-nils default-config environ-config config) {})))

(def ^:dynamic get-effective-config (memoize get-effective-config*))                                                          ; assuming environ-config is constant
