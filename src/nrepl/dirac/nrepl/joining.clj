(ns dirac.nrepl.joining
  "A functionality related to joined Dirac sessions."
  (:require [clojure.tools.nrepl.transport :as transport]
            [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.version :refer [version]]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.jobs :as jobs]
            [dirac.nrepl.messages :as messages]
            [clojure.string :as string]
            [dirac.nrepl.special :as special]
            [dirac.nrepl.protocol :as protocol]))

; -- handlers for middleware operations -------------------------------------------------------------------------------------

(defn prepare-no-target-session-match-error-message [session]
  (let [info (sessions/get-target-session-info session)]
    (str (messages/make-no-target-session-match-msg info) "\n")))

(defn prepare-no-target-session-match-help-message [session]
  (let [info (sessions/get-target-session-info session)]
    (str (messages/make-no-target-session-help-msg info) "\n")))

(defn report-missing-target-session! [nrepl-message]
  (log/debug "report-missing-target-session!")
  (let [{:keys [session]} nrepl-message
        err (prepare-no-target-session-match-error-message session)
        out (prepare-no-target-session-match-help-message session)]
    (helpers/send-response! nrepl-message (protocol/prepare-err-response err))
    (helpers/send-response! nrepl-message (protocol/prepare-out-response out))
    (helpers/send-response! nrepl-message (protocol/prepare-done-response))))

(defn report-nonforwardable-nrepl-message! [nrepl-message]
  (log/debug "report-nonforwardable-nrepl-message!")
  (let [{:keys [op]} nrepl-message
        clean-message (dissoc nrepl-message :session :transport)
        err (str (messages/make-nrepl-message-cannot-be-forwarded-msg (pr-str clean-message)) "\n")
        out (str (messages/make-no-forwarding-help-msg (or op "?")) "\n")]
    (helpers/send-response! nrepl-message (protocol/prepare-err-response err))
    (helpers/send-response! nrepl-message (protocol/prepare-out-response out))
    (helpers/send-response! nrepl-message (protocol/prepare-done-response))))

(defn prepare-forwardable-message [nrepl-message]
  ; based on what is currently supported by intercom on client-side
  ; we deliberately filter keys to a "safe" subset, so the message can be unserialized on client side
  (case (:op nrepl-message)
    "eval" (select-keys nrepl-message [:id :op :code])
    "load-file" (select-keys nrepl-message [:id :op :file :file-path :file-name])
    "interrupt" (select-keys nrepl-message [:id :op :interrupt-id])
    nil))

(defn serialize-message [nrepl-message]
  (pr-str nrepl-message))

(defn is-eval-cljs-quit? [nrepl-message]
  (and (= (:op nrepl-message) "eval")
       (= ":cljs/quit" (string/trim (:code nrepl-message)))))

(defn forward-message-to-joined-session! [nrepl-message]
  (log/trace "forward-message-to-joined-session!" (logging/pprint nrepl-message))
  (if (is-eval-cljs-quit? nrepl-message)
    (special/issue-dirac-special-command! nrepl-message ":disjoin")
    (let [{:keys [id session transport]} nrepl-message]
      (if-let [target-dirac-session-descriptor (sessions/find-target-dirac-session-descriptor session)]
        (if-let [forwardable-message (prepare-forwardable-message nrepl-message)]
          (let [job-id (helpers/generate-uuid)
                target-session (sessions/get-dirac-session-descriptor-session target-dirac-session-descriptor)
                target-transport (sessions/get-dirac-session-descriptor-transport target-dirac-session-descriptor)
                target-message (protocol/prepare-handle-forwarded-nrepl-message-response
                                 (helpers/generate-uuid)
                                 (sessions/get-session-id target-session)
                                 job-id
                                 (serialize-message forwardable-message))]
            (jobs/register-observed-job! job-id id session transport 1000)
            (transport/send target-transport target-message))
          (report-nonforwardable-nrepl-message! nrepl-message))
        (report-missing-target-session! nrepl-message)))))
