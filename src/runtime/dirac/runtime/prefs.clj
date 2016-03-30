(ns dirac.runtime.prefs
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
(def ^:dynamic *context-availablity-total-time-limit* (env :dirac-context-availablity-total-time-limit))
(def ^:dynamic *context-availablity-next-trial-waiting-time* (env :context-availablity-next-trial-waiting-time))
(def ^:dynamic *eval-time-limit* (env :dirac-eval-time-limit))

(defmacro static-pref [key kind]
  (let [sym (symbol (str "*" (name key) "*"))]
    `(if ~sym {~key (~kind ~sym)})))

(defmacro gen-static-prefs []
  (merge {}
         (static-pref :agent-host str)
         (static-pref :agent-port int)
         (static-pref :agent-verbose boolean)
         (static-pref :agent-auto-reconnect boolean)
         (static-pref :agent-response-timeout int)
         (static-pref :weasel-verbose boolean)
         (static-pref :weasel-auto-reconnect boolean)
         (static-pref :weasel-pre-eval-delay int)
         (static-pref :install-check-total-time-limit int)
         (static-pref :install-check-next-trial-waiting-time int)
         (static-pref :install-check-eval-time-limit int)
         (static-pref :context-availablity-total-time-limit int)
         (static-pref :context-availablity-next-trial-waiting-time int)
         (static-pref :eval-time-limit int)))