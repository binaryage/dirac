(ns dirac.nrepl.bootstrap
  (:require [clojure.tools.nrepl.middleware :refer [set-descriptor!]]
            [clojure.tools.logging :as log]
            [dirac.lib.weasel-server :as weasel-server]
            [dirac.nrepl.piggieback :as piggieback]
            [dirac.nrepl.config :as config]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.debug :as debug]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.messages :as messages]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.protocol :as protocol]
            [dirac.nrepl.utils :as utils]
            [dirac.lib.utils :as lib-utils]))

; -- support for booting into CLJS REPL -------------------------------------------------------------------------------------

; this message is sent to client after booting into a Dirac REPL
(defn send-bootstrap-info! [nrepl-message weasel-url]
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [info-message {:op         :bootstrap-info
                      :weasel-url weasel-url}]
    (log/debug "sending :bootstrap-info" info-message)
    (log/trace "send-bootstrap-info!" weasel-url "\n" (debug/pprint-nrepl-message nrepl-message))
    (helpers/send-response! nrepl-message info-message)))

(defn weasel-server-started! [nrepl-message weasel-url runtime-tag]
  (assert weasel-url)
  (assert (state/has-session?))                                                                                               ; we asssume this code is running within ensure-session
  (debug/log-stack-trace!)
  (let [{:keys [session transport]} nrepl-message]
    (sessions/add-dirac-session-descriptor! session transport runtime-tag)
    (send-bootstrap-info! nrepl-message weasel-url)))

(defn preferred-compiler-selection [sticky? dirac-nrepl-config]
  (if sticky?
    (state/get-selected-compiler-of-dead-session (:parent-session dirac-nrepl-config))))                                      ; attempt to stick to previous compiler selection

(defn start-cljs-repl! [nrepl-message dirac-nrepl-config repl-env repl-options]
  (log/trace "start-cljs-repl!\n"
             "dirac-nrepl-config:\n"
             (lib-utils/pp dirac-nrepl-config)
             "repl-env:\n"
             (lib-utils/pp repl-env)
             "repl-options:\n"
             (lib-utils/pp repl-options))
  (debug/log-stack-trace!)
  (let [; WARNING
        ; we are being called via boot-dirac-repl! which has been invoked outside our middleware
        ; that is why we have to wrap our nrepl-message for the rest of processing
        nrepl-message (utils/wrap-nrepl-message nrepl-message)
        initial-session-meta (state/get-session-meta)]
    (try
      (state/set-session-cljs-ns! 'cljs.user)
      (let [preferred-compiler (or (:preferred-compiler dirac-nrepl-config) "dirac/sticky")
            want-new? (= preferred-compiler "dirac/new")
            want-sticky? (= preferred-compiler "dirac/sticky")]
        (if (or want-new? want-sticky?)
          (do
            (utils/start-new-cljs-compiler-repl-environment! nrepl-message dirac-nrepl-config repl-env repl-options)
            (state/set-session-selected-compiler! (preferred-compiler-selection want-sticky? dirac-nrepl-config)))
          (state/set-session-selected-compiler! preferred-compiler)))                                                         ; TODO: validate that preferred compiler exists
      (state/set-session-dirac-nrepl-config! dirac-nrepl-config)
      (state/set-session-cljs-repl-env! repl-env)
      (state/set-session-cljs-repl-options! repl-options)
      (state/set-session-original-clj-ns! *ns*)                                                                               ; interruptible-eval is in charge of emitting the final :ns response in this context
      (set! *ns* (find-ns (state/get-session-cljs-ns)))                                                                       ; TODO: is this really needed? is it for macros?
      (helpers/send-response! nrepl-message (utils/prepare-current-env-info-response))
      (catch Exception e
        (state/set-session-meta! initial-session-meta)                                                                        ; restore session to initial state
        (throw e)))))

(defn bootstrap! [config]
  (if-let [nrepl-message (state/get-last-seen-nrepl-message)]
    (try
      (let [weasel-repl-options (:weasel-repl config)
            runtime-tag (:runtime-tag config)
            after-launch! (fn [repl-env weasel-url]
                            (log/trace "after-launch handler called with repl-env:\n" (lib-utils/pp repl-env))
                            (weasel-server-started! nrepl-message weasel-url runtime-tag))
            repl-options (assoc weasel-repl-options :after-launch after-launch!)
            repl-env (weasel-server/make-weasel-repl-env repl-options)
            cljs-repl-options (:cljs-repl-options config)]
        (assert (not (state/has-session?)))
        (state/ensure-session (:session nrepl-message)
          (start-cljs-repl! nrepl-message config repl-env cljs-repl-options)))
      (catch Throwable e
        (log/error "Unable to boostrap Dirac ClojureScript REPL:\n" e)
        (helpers/send-response! nrepl-message (protocol/prepare-bootstrap-error-response (helpers/capture-exception-details e)))
        (throw e)))
    (do
      (log/error (messages/make-missing-nrepl-message-msg))
      (throw (ex-info "Unable to bootstrap due to missing expected last seen nREPL message." {})))))
