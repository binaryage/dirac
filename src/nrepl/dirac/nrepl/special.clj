(ns dirac.nrepl.special
  (:require [clojure.tools.nrepl.middleware.interruptible-eval :as nrepl-ieval]
            [clojure.main]
            [clojure.tools.logging :as log]
            [clojure.string :as string]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.controls :as controls]
            [dirac.nrepl.transports.output-capturing :refer [make-nrepl-message-with-captured-output]]))

; -- handlers for middleware operations -------------------------------------------------------------------------------------

(defn dirac-special-command? [nrepl-message]
  (let [code (:code nrepl-message)]
    (if (string? code)
      (some? (re-find #"^\(?dirac!" code)))))                                                                                 ; we don't want to use read-string here, regexp test should be safe and quick

(defn special-repl-eval! [nrepl-message code ns]
  (let [{:keys [session]} nrepl-message]
    (let [result (with-bindings @session
                   (try
                     (let [form (read-string code)]
                       (binding [state/*reply!* #(helpers/send-response! nrepl-message %)
                                 *ns* ns
                                 nrepl-ieval/*msg* nrepl-message]
                         (eval form)))
                     (catch Throwable e
                       (let [root-ex (clojure.main/root-cause e)
                             details (helpers/get-exception-details nrepl-message e)]
                         (log/error (str "Clojure eval error during eval of a special dirac command: " details))
                         ; repl-caught will produce :err message, but we are not under driver, so it won't be converted to :print-output
                         ; that is why we present error output to user REPL manually
                         (clojure.main/repl-caught e)
                         (helpers/send-response! nrepl-message {:op      :print-output
                                                                :kind    :java-trace
                                                                :content (helpers/capture-exception-details e)})
                         (helpers/send-response! nrepl-message {:status  :eval-error
                                                                :ex      (-> e class str)
                                                                :root-ex (-> root-ex class str)
                                                                :details details})
                         ::exception))
                     (finally
                       (.flush *out*)
                       (.flush *err*))))
          base-reply {:status :done}
          reply (if (= ::controls/no-result ::exception result)
                  base-reply
                  (assoc base-reply
                    :value (helpers/safe-pr-str result)
                    :printed-value 1))]
      (if-not (= ::exception result)
        (helpers/send-response! nrepl-message reply)))))

(defn sanitize-dirac-command [code]
  ; this is just for convenience, we convert some common forms to canonical (dirac! :help) form
  (let [trimmed-code (string/trim code)]
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
