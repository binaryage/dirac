(ns dirac.nrepl.special
  (:require [clojure.main :refer [root-cause repl-caught]]
            [clojure.tools.logging :as log]
            [clojure.string :as string]
            [dirac.nrepl.controls :as controls]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.transports.output-capturing :refer [make-nrepl-message-with-captured-output]]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.driver :as driver]
            [dirac.nrepl.protocol :as protocol])
  (:import (clojure.lang Namespace)
           java.io.Writer))

; -- handlers for middleware operations -------------------------------------------------------------------------------------

(defn dirac-special-command? [nrepl-message]
  (let [code (:code nrepl-message)]
    (if (string? code)
      (some? (re-find #"^\(?dirac!" code)))))                                                                                 ; we don't want to use read-string here, regexp test should be safe and quick

(defn eval-job! [nrepl-message code-str ns driver caught-fn flush-fn]
  (try
    (binding [*ns* ns
              state/*nrepl-message* nrepl-message]
      (eval (read-string code-str)))
    (catch Throwable e
      (caught-fn e nil nil)
      ::controls/no-result)
    (finally
      (.flush *out*)
      (.flush *err*))))

(defn special-repl-eval! [nrepl-message code-str ns]                                                                          ; TODO: we could get rid of nrepl-message dependency here
  {:pre [(string? code-str)
         (instance? Namespace ns)]}
  (log/debug "special-repl-eval!" code-str "in" ns)
  (let [response-fn (partial helpers/send-response! nrepl-message)
        eval-job-fn (partial eval-job! nrepl-message code-str ns)
        job-id (:id nrepl-message)
        result (with-bindings @(:session nrepl-message)
                 (driver/wrap-with-driver job-id eval-job-fn response-fn))
        no-result? (= ::controls/no-result result)
        response (cond-> (protocol/prepare-done-response)
                         (not no-result?) (merge (protocol/prepare-printed-value-response (helpers/safe-pr-str result))))]
    (helpers/send-response! nrepl-message response)))

(defn sanitize-dirac-command [code-str]
  ; this is just for convenience, we convert some common forms to canonical (dirac! :help) form
  (let [trimmed-code (string/trim code-str)]
    (if (or (= trimmed-code "dirac!")
            (= trimmed-code "(dirac!)"))
      "(dirac! :help)"
      trimmed-code)))

(defn handle-dirac-special-command! [nrepl-message]
  (let [{:keys [code session]} nrepl-message
        message (if (sessions/dirac-session? session)
                  (make-nrepl-message-with-captured-output nrepl-message)
                  nrepl-message)]
    (special-repl-eval! message (sanitize-dirac-command code) (find-ns 'dirac.nrepl.controls))))                              ; we want to eval special commands in dirac.nrepl.controls namespace

(defn issue-dirac-special-command! [nrepl-message command]
  (log/debug "issue-dirac-special-command!" command)
  (handle-dirac-special-command! (assoc nrepl-message :code (str "(dirac! " command ")"))))
