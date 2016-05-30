(ns dirac.runtime.repl
  (:require [environ.core :refer [env]]))

(def ^:dynamic *agent-host* (env :dirac-agent-host))
(def ^:dynamic *agent-port* (env :dirac-agent-port))
(def ^:dynamic *agent-verbose* (env :dirac-agent-verbose))
(def ^:dynamic *agent-auto-reconnect* (env :dirac-agent-auto-reconnect))
(def ^:dynamic *agent-response-timeout* (env :dirac-agent-response-timeout))
(def ^:dynamic *weasel-verbose* (env :dirac-weasel-verbose))
(def ^:dynamic *weasel-auto-reconnect* (env :dirac-weasel-auto-reconnect))
(def ^:dynamic *weasel-pre-eval-delay* (env :dirac-weasel-pre-eval-delay))
(def ^:dynamic *install-check-total-time-limit* (env :dirac-install-check-total-time-limit))
(def ^:dynamic *install-check-next-trial-waiting-time* (env :dirac-install-check-next-trial-waiting-time))
(def ^:dynamic *install-check-eval-time-limit* (env :dirac-install-check-eval-time-limit))
(def ^:dynamic *context-availability-total-time-limit* (env :dirac-context-availability-total-time-limit))
(def ^:dynamic *context-availability-next-trial-waiting-time* (env :context-availability-next-trial-waiting-time))
(def ^:dynamic *eval-time-limit* (env :dirac-eval-time-limit))

(defmacro gen-config []
  (merge {}
         (if *agent-host* [:agent-host (str *agent-host*)])
         (if *agent-port* [:agent-port (Integer/parseInt *agent-port*)])
         (if *agent-verbose* [:agent-verbose (boolean *agent-verbose*)])
         (if *agent-auto-reconnect* [:agent-auto-reconnect (boolean *agent-auto-reconnect*)])
         (if *agent-response-timeout* [:agent-response-timeout (Integer/parseInt *agent-response-timeout*)])
         (if *weasel-verbose* [:weasel-verbose (boolean *weasel-verbose*)])
         (if *weasel-auto-reconnect* [:weasel-auto-reconnect (boolean *weasel-auto-reconnect*)])
         (if *weasel-pre-eval-delay* [:weasel-pre-eval-delay (Integer/parseInt *weasel-pre-eval-delay*)])
         (if *install-check-total-time-limit* [:install-check-total-time-limit (Integer/parseInt *install-check-total-time-limit*)])
         (if *install-check-next-trial-waiting-time* [:install-check-next-trial-waiting-time (Integer/parseInt *install-check-next-trial-waiting-time*)])
         (if *install-check-eval-time-limit* [:install-check-eval-time-limit (Integer/parseInt *install-check-eval-time-limit*)])
         (if *context-availability-total-time-limit* [:context-availability-total-time-limit (Integer/parseInt *context-availability-total-time-limit*)])
         (if *context-availability-next-trial-waiting-time* [:context-availability-next-trial-waiting-time (Integer/parseInt *context-availability-next-trial-waiting-time*)])
         (if *eval-time-limit* [:eval-time-limit (Integer/parseInt *eval-time-limit*)])))

(defmacro with-safe-printing [& body]
  `(binding [cljs.core/*print-level* (dirac.runtime.prefs/pref :safe-print-level)
             cljs.core/*print-length* (dirac.runtime.prefs/pref :safe-print-length)]
     ~@body))