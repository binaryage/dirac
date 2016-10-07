(ns dirac.nrepl.utils
  "High-level helper methods possibly depending on mutable global state."
  (:require [cljs.analyzer :as analyzer]
            [clojure.tools.logging :as log]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.eval :as eval]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.state :as state]
            [dirac.logging :as logging]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.messages :as messages]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.transports.status-cutting :refer [make-nrepl-message-with-status-cutting]]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.transports.bencode-workarounds :refer [make-nrepl-message-with-bencode-workarounds]]
            [dirac.nrepl.transports.debug-logging :refer [make-nrepl-message-with-debug-logging]]
            [dirac.nrepl.transports.errors-observing :refer [make-nrepl-message-with-observed-errors]]
            [dirac.nrepl.transports.trace-printing :refer [make-nrepl-message-with-trace-printing]]
            [dirac.nrepl.transports.job-observing :refer [make-nrepl-message-with-job-observing]]))

(defn wrap-nrepl-message-if-observed-job [nrepl-message]
  (if-let [observed-job (jobs/get-observed-job nrepl-message)]
    (make-nrepl-message-with-job-observing observed-job nrepl-message)
    nrepl-message))

(defn wrap-nrepl-message-for-dirac-session [nrepl-message]
  (if (state/dirac-session? (:session nrepl-message))
    (-> nrepl-message
        make-nrepl-message-with-trace-printing                                                                                ; note: the order is important here, message should first have errors observed and then traced
        make-nrepl-message-with-observed-errors)
    nrepl-message))

(defn wrap-nrepl-message [nrepl-message]
  (-> nrepl-message
      (make-nrepl-message-with-debug-logging)
      (make-nrepl-message-with-bencode-workarounds)
      (wrap-nrepl-message-for-dirac-session)))

(defn prepare-current-env-info-response []
  (eval/prepare-current-env-info-response))

(defn start-new-cljs-compiler-repl-environment! [nrepl-message dirac-nrepl-config repl-env repl-options]
  (log/trace "start-new-cljs-compiler-repl-environment!\n")
  (let [compiler-env nil
        code (or (:repl-init-code dirac-nrepl-config) config/standard-repl-init-code)
        job-id (or (:id nrepl-message) (helpers/generate-uuid))
        ns (:ns nrepl-message)
        effective-repl-options (assoc repl-options
                                 ; the first run through the cljs REPL is effectively part
                                 ; of setup; loading core, (ns cljs.user ...), etc, should
                                 ; not yield a value. But, we do capture the compiler
                                 ; environment now (instead of attempting to create one to
                                 ; begin with, because we can't reliably replicate what
                                 ; cljs.repl/repl* does in terms of options munging
                                 :init (fn []
                                         (compilers/capture-current-compiler-and-select-it!))
                                 :print (fn [& _]
                                          (log/trace "print-fn (no-op)")))                                                    ; silence any responses
        response-fn (partial helpers/send-response! nrepl-message)]
    (eval/eval-in-cljs-repl! code ns repl-env compiler-env effective-repl-options job-id response-fn)))

(defn spawn-compiler! [nrepl-message & [options]]
  (let [initial-session-meta (state/get-session-meta)
        dirac-nrepl-config (merge (state/get-session-dirac-nrepl-config) (:dirac-nrepl-config options))
        repl-env (state/get-session-cljs-repl-env)
        repl-options (merge (state/get-session-cljs-repl-options) (:repl-options options))]
    (log/trace "spawn-compiler!\n"
               "dirac-nrepl-config:\n"
               (logging/pprint dirac-nrepl-config)
               "repl-env:\n"
               (logging/pprint repl-env)
               "repl-options:\n"
               (logging/pprint repl-options))
    (debug/log-stack-trace!)
    (try
      (state/set-session-cljs-ns! 'cljs.user)
      (start-new-cljs-compiler-repl-environment! nrepl-message dirac-nrepl-config repl-env repl-options)
      (helpers/send-response! nrepl-message (prepare-current-env-info-response))
      (catch Exception e
        (state/set-session-meta! initial-session-meta)                                                                        ; restore session to initial state
        (throw e)))))

(defn kill-compiler! [compiler-id]
  (compilers/unregister-compiler-descriptor! compiler-id))

(defn valid-compiler-to-kill? [compiler-id]
  (some? (re-matches #"^dirac.*" compiler-id)))

(defn valid-compiler-descriptor-to-kill? [compiler-descriptor]
  (valid-compiler-to-kill? (compilers/get-compiler-descriptor-id compiler-descriptor)))

(defn kill-matching-compilers! [which]
  (let [matching-descriptors (if (nil? which)
                               (remove nil? (list (compilers/get-selected-compiler-descriptor)))
                               (compilers/filter-available-matching-compiler-descriptors which))
        valid-descriptors (filter valid-compiler-descriptor-to-kill? matching-descriptors)
        invalid-descriptors (remove valid-compiler-descriptor-to-kill? matching-descriptors)
        valid-compiler-ids (keep compilers/get-compiler-descriptor-id valid-descriptors)
        invalid-compiler-ids (keep compilers/get-compiler-descriptor-id invalid-descriptors)]
    (doseq [compiler-id valid-compiler-ids]
      (kill-compiler! compiler-id))
    [valid-compiler-ids invalid-compiler-ids]))

(defn report-missing-compiler! [nrepl-message selected-compiler]
  (let [msg (messages/make-missing-compiler-msg selected-compiler)]
    (helpers/send-response! nrepl-message (protocol/prepare-print-output-response :stderr msg))))

(defn user-wants-quit? [code]
  (.endsWith (.trim code) ":cljs/quit"))

(defn evaluate!* [nrepl-message]
  (let [{:keys [session code]} nrepl-message
        cljs-repl-env (state/get-session-cljs-repl-env)]
    (if-not (user-wants-quit? code)
      (let [job-id (or (:id nrepl-message) (helpers/generate-uuid))
            ns (:ns nrepl-message)
            mode (:dirac nrepl-message)
            scope-info (:scope-info nrepl-message)
            selected-compiler (state/get-session-selected-compiler)
            cljs-repl-options (state/get-session-cljs-repl-options)
            response-fn (partial helpers/send-response! nrepl-message)]
        (if-let [compiler-env (compilers/get-selected-compiler-env)]
          (eval/eval-in-cljs-repl! code ns cljs-repl-env compiler-env cljs-repl-options job-id response-fn scope-info mode)
          (report-missing-compiler! nrepl-message selected-compiler)))
      (let [original-clj-ns (state/get-session-original-clj-ns)]
        (reset! (:cached-setup cljs-repl-env) :tear-down)                                                                     ; TODO: find a better way
        (cljs.repl/-tear-down cljs-repl-env)
        (sessions/remove-dirac-session-descriptor! session)
        (swap! session assoc #'*ns* original-clj-ns)                                                                          ; TODO: is this really needed?
        (helpers/send-response! nrepl-message {:value         "nil"
                                               :printed-value 1
                                               :ns            (str original-clj-ns)}))))
  (helpers/send-response! nrepl-message {:status :done}))

(defn evaluate! [nrepl-message]
  (debug/log-stack-trace!)
  (let [status-cutting-nrepl-message (make-nrepl-message-with-status-cutting nrepl-message)]
    (evaluate!* status-cutting-nrepl-message)))

(defn load-file! [nrepl-message]
  (let [{:keys [file-path]} nrepl-message]
    (evaluate! (assoc nrepl-message :code (format "(load-file %s)" (pr-str file-path))))))
