(ns dirac.nrepl.controls
  (:require [clojure.string :as string]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.usage :as usage]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.compilers :as compilers]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.utils :as utils]
            [dirac.nrepl.messages :as messages]
            [dirac.nrepl.figwheel :as figwheel])
  (:import (java.util.regex Pattern)))

; note: this namespace defines the context where special dirac commands are eval'd

(defn error-println [& args]
  (apply helpers/error-println args)
  ::no-result)

(defn ^:dynamic warn-about-retargeting-if-needed [session]
  (if (not= session (state/get-current-session))
    (println (messages/make-retargeting-warning-msg))))

; == special REPL commands ==================================================================================================

; we are forgiving when reading the sub-command argument,
; it gets converted to keyword so all following variations are permitted:
;
;   (dirac! :help)
;   (dirac! 'help)
;   (dirac! "help")
;
(defmulti dirac! (fn [command & _args] (keyword command)))

; note: we want to be forgiving when user passes extra parameters we don't care about
; unfortunately stack traces from eval are cryptic and could confuse some people

; -- (dirac! :help) ---------------------------------------------------------------------------------------------------------

(defmethod dirac! :help [_ & [command]]
  (if (nil? command)
    (println (get usage/docs nil))
    (if-let [doc (get usage/docs (keyword command))]
      (println doc)
      (error-println (messages/make-no-such-command-msg command))))
  ::no-result)

; -- (dirac! :version) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :version [_ & _]
  (let [nrepl-info (helpers/get-nrepl-info)]
    (println (messages/make-version-msg nrepl-info)))
  ::no-result)

; -- (dirac! :status) -------------------------------------------------------------------------------------------------------

(defn prepare-session-description [session]
  (cond
    (sessions/dirac-session? session)
    (let [selected-compiler (state/get-session-selected-compiler session)
          human-selected-compiler (helpers/make-human-readable-selected-compiler selected-compiler)
          compiler-descriptor (compilers/get-selected-compiler-descriptor session)]
      (str "Dirac session (ClojureScript) connected to '" (sessions/get-dirac-session-tag session) "'\n"
           "with selected ClojureScript compiler " human-selected-compiler
           (if (some? compiler-descriptor)
             (let [compiler-id (compilers/get-compiler-descriptor-id compiler-descriptor)]
               (if-not (= compiler-id selected-compiler)
                 (str " which is currently matching compiler <" compiler-id ">")))
             (str " which currently does not match any available compiler"))))

    (sessions/joined-session? session)
    (let [target-info (sessions/get-target-session-info session)
          target-session (sessions/get-target-session session)]
      (str "joined Dirac session (ClojureScript) which targets '" target-info "'\n"
           (if (some? target-session)
             (str "which is currently forwarding commands to the " (prepare-session-description target-session))
             (str "which currently does not match any existing session"))))

    :else
    (str "normal session (Clojure)")))

(defmethod dirac! :status [_ & _]
  (let [session (sessions/get-current-session)]
    (println (messages/make-status-msg (prepare-session-description session))))
  (state/send-response! (utils/prepare-current-env-info-response))
  ::no-result)

; -- (dirac! :ls) -----------------------------------------------------------------------------------------------------------

(defmethod dirac! :ls [_ & _]
  (let [target-session (sessions/get-current-retargeted-session)
        tags (sessions/get-dirac-session-tags target-session)
        current-tag (sessions/get-current-session-tag target-session)
        avail-compilers (compilers/collect-all-available-compiler-descriptors target-session)
        selected-compiler-id (compilers/get-selected-compiler-id target-session)
        marker (if (= target-session (state/get-current-session)) "->" "~>")]
    (println (messages/make-list-dirac-sessions-msg tags current-tag marker))
    (println)
    (println (messages/make-list-compilers-msg (compilers/compiler-descriptors-ids avail-compilers) selected-compiler-id marker)))
  (state/send-response! (utils/prepare-current-env-info-response))
  ::no-result)

; -- (dirac! :join) ---------------------------------------------------------------------------------------------------------

(defn announce-join! [& _]
  (println (messages/make-after-join-msg))
  (dirac! :match)                                                                                                             ; this should give user immediate feedback about newly matched sessions
  (println (messages/make-cljs-quit-msg)))                                                                                    ; triggers Cursive switching to CLJS REPL mode

(defmethod dirac! :join [_ & [matcher]]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (messages/make-cannot-join-dirac-session-msg))
      (nil? matcher) (announce-join! (sessions/join-session-with-most-recent-matcher! session))
      (integer? matcher) (announce-join! (sessions/join-session-with-integer-matcher! session matcher))
      (string? matcher) (announce-join! (sessions/join-session-with-substr-matcher! session matcher))
      (instance? Pattern matcher) (announce-join! (sessions/join-session-with-regex-matcher! session matcher))
      :else (error-println (messages/make-invalid-matcher-msg matcher))))
  ::no-result)

; -- (dirac! :disjoin) ------------------------------------------------------------------------------------------------------

(defmethod dirac! :disjoin [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (messages/make-cannot-disjoin-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (messages/make-cannot-disjoin-clojure-session-msg))
      :else (do
              (sessions/disjoin-session! session)
              (println (messages/make-session-disjoined-msg)))))
  ::no-result)

; -- (dirac! :match) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :match [_ & _]
  (let [session (sessions/get-current-session)]
    (cond
      (sessions/dirac-session? session) (error-println (messages/make-cannot-join-dirac-session-msg))
      (not (sessions/joined-session? session)) (error-println (messages/make-cannot-match-clojure-session-msg))
      :else (let [description (sessions/get-target-session-info session)
                  tags (sessions/list-matching-sessions-tags session)]
              (if (empty? tags)
                (println (messages/make-no-matching-dirac-sessions-msg description))
                (println (messages/make-list-matching-dirac-sessions-msg description tags))))))
  ::no-result)

; -- (dirac! :switch) -------------------------------------------------------------------------------------------------------

(defn validate-selected-compiler [user-input]
  (cond
    (or (nil? user-input) (string? user-input) (instance? Pattern user-input)) user-input
    (and (integer? user-input) (pos? user-input)) user-input
    :else ::invalid-input))

(defmethod dirac! :switch [_ & [user-input]]
  (let [selected-compiler (validate-selected-compiler user-input)]
    (if (= ::invalid-input selected-compiler)
      (error-println (messages/make-invalid-compiler-error-msg user-input))
      (let [session (sessions/get-current-retargeted-session)]
        (warn-about-retargeting-if-needed session)
        (compilers/select-compiler! session selected-compiler)
        (let [matched-compiler-descriptor (compilers/find-available-matching-compiler-descriptor session selected-compiler)]
          (if (nil? matched-compiler-descriptor)
            (error-println (messages/make-no-compilers-msg selected-compiler))))
        (state/send-response! (utils/prepare-current-env-info-response)))))
  ::no-result)

; -- (dirac! :spawn) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :spawn [_ & [options]]
  (let [session (sessions/get-current-retargeted-session)]
    (warn-about-retargeting-if-needed session)
    (cond
      (not (sessions/dirac-session? session)) (error-println (messages/make-cannot-spawn-outside-dirac-session-msg))
      :else (utils/spawn-compiler! state/*nrepl-message* options)))
  ::no-result)

; -- (dirac! ::kill) --------------------------------------------------------------------------------------------------------

(defmethod dirac! :kill [_ & [user-input]]
  (let [selected-compiler (validate-selected-compiler user-input)]
    (if (= ::invalid-input selected-compiler)
      (error-println (messages/make-invalid-compiler-error-msg user-input))
      (let [session (sessions/get-current-retargeted-session)]
        (warn-about-retargeting-if-needed session)
        (let [[killed-compiler-ids invalid-compiler-ids] (utils/kill-matching-compilers! selected-compiler)]
          (if (empty? killed-compiler-ids)
            (error-println (messages/make-no-killed-compilers-msg user-input))
            (do
              (println (messages/make-report-killed-compilers-msg user-input killed-compiler-ids))
              (if-not (compilers/get-selected-compiler-id session)                                                            ; switch to first available compiler the current one got killed
                (compilers/select-compiler! session nil))                                                                     ; note that this still might not guarantee valid compiler selection, the compiler list might be empty
              (state/send-response! (utils/prepare-current-env-info-response))))
          (if-not (empty? invalid-compiler-ids)
            (error-println (messages/make-report-invalid-compilers-not-killed-msg user-input invalid-compiler-ids)))))))
  ::no-result)

; -- (dirac! :fig) ----------------------------------------------------------------------------------------------------------

(defmethod dirac! :fig [_ & [fn-name & args]]
  (let [result (apply figwheel/call-repl-api! (or fn-name :fig-status) args)]
    (let [response (case result
                     ::figwheel/not-found (error-println (messages/make-figwheel-api-not-found-msg))
                     ::figwheel/not-fn (error-println (messages/make-figwheel-bad-api-msg))
                     result)]
      (state/send-response! (utils/prepare-current-env-info-response))
      response)))

; -- default handler --------------------------------------------------------------------------------------------------------

(defmethod dirac! :default [command & _]
  (if (some? command)
    (error-println (messages/make-default-error-msg command))
    (dirac! :help))
  ::no-result)
