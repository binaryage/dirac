(ns dirac.nrepl.sessions
  (:require [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.debug :as debug]
            [clojure.tools.nrepl.middleware.interruptible-eval :as nrepl-ieval]
            [dirac.backport.string :as backport-string]
            [clojure.string :as string]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-session-id [session]
  (-> session meta :id))

(defn humanize-session-id [session-id]
  {:pre (string? session-id)}
  (first (string/split session-id #"-")))

(defn dirac-session? [session]
  (state/dirac-session? session))

(defn get-current-session []
  (state/get-current-session))

; -- dirac sessions management ----------------------------------------------------------------------------------------------

(defn make-dirac-session-descriptor [session transport tag]
  {:session   session
   :transport transport
   :tag       tag})

(defn find-dirac-session-descriptor [session]
  (some #(if (= (:session %) session) %) @state/session-descriptors))

(defn get-dirac-session-descriptor-transport [session-descriptor]
  (:transport session-descriptor))

(defn get-dirac-session-descriptor-session [session-descriptor]
  (:session session-descriptor))

(defn get-dirac-session-descriptor-tag [session-descriptor]
  (:tag session-descriptor))

(defn add-dirac-session-descriptor! [session transport tag]
  (log/debug "add-dirac-session-descriptor!" (get-session-id session) tag)
  (log/trace transport (debug/pprint-session session))
  (if-not (find-dirac-session-descriptor session)
    (let [session-descriptor (make-dirac-session-descriptor session transport tag)]
      (swap! state/session-descriptors concat (list session-descriptor)))
    (log/error "attempt to add duplicit session descriptor:\n" (debug/pprint-session session))))

(defn remove-dirac-session-descriptor! [session]
  (let [session-id (get-session-id session)]
  (log/debug "remove-dirac-session-descriptor!" )
  (log/trace (debug/pprint-session session))
  (state/register-selected-compiler-for-dead-session! session-id (state/get-session-selected-compiler session))
  (if-let [session-descriptor (find-dirac-session-descriptor session)]
    (swap! state/session-descriptors #(remove #{session-descriptor} %))
    (log/error "attempt to remove unknown session descriptor:\n" (debug/pprint-session session)))))

(defn find-matching-dirac-session-descriptors [matcher]
  (let [descriptors @state/session-descriptors
        descriptors-count (count descriptors)
        match-result (fn [index descriptor]
                       (if (matcher descriptor index descriptors-count) descriptor))]
    (keep-indexed match-result descriptors)))

(defn find-matching-dirac-session-descriptor [matcher]
  (first (find-matching-dirac-session-descriptors matcher)))

(defn prepare-dirac-session-descriptor-tag [session-descriptor]
  (let [tag (get-dirac-session-descriptor-tag session-descriptor)
        sanitized-tag (if (empty? tag) "?" tag)
        session (get-dirac-session-descriptor-session session-descriptor)
        session-id (get-session-id session)]
    (str sanitized-tag " [" (humanize-session-id session-id) "]")))

(defn get-dirac-session-descriptors-tags [session-descriptors]
  (map prepare-dirac-session-descriptor-tag session-descriptors))

(defn get-dirac-session-tag [session]
  (prepare-dirac-session-descriptor-tag (find-dirac-session-descriptor session)))

(defn get-other-sessions-descriptors [session]
  (remove #(= session (get-dirac-session-descriptor-session %)) @state/session-descriptors))

(defn get-dirac-session-tags [session]
  (let [current-session-descriptor (find-dirac-session-descriptor session)
        other-descriptors (get-other-sessions-descriptors session)
        ordered-descriptors (keep identity (concat [current-session-descriptor] other-descriptors))]
    (get-dirac-session-descriptors-tags ordered-descriptors)))

(defn get-current-session-tag [session]
  (if-let [current-session-descriptor (find-dirac-session-descriptor session)]
    (prepare-dirac-session-descriptor-tag current-session-descriptor)))

(defn for-each-session [f & args]
  (let [* (fn [session-descriptor]
            (let [session (get-dirac-session-descriptor-session session-descriptor)]
              (apply f session args)))]
    (doall (map * @state/session-descriptors))))

; -- joining sessions -------------------------------------------------------------------------------------------------------

(defn make-joined-session-descriptor [matcher-fn info]
  {:matcher matcher-fn
   :info    info})

(defn get-joined-session-descriptor [session]
  (::joined-session-descriptor (meta session)))

(defn get-joined-session-matcher [session]
  (:matcher (get-joined-session-descriptor session)))

(defn get-target-session-info [session]
  (:info (get-joined-session-descriptor session)))

(defn joined-session? [session]
  (some? (get-joined-session-descriptor session)))

(defn join-session! [session matcher & [info]]
  {:pre [(some? matcher)]}
  (alter-meta! session assoc ::joined-session-descriptor (make-joined-session-descriptor matcher info)))

(defn disjoin-session! [session]
  (alter-meta! session dissoc ::joined-session-descriptor))

(defn find-target-dirac-session-descriptor [session]
  (if-let [matcher-fn (get-joined-session-matcher session)]
    (find-matching-dirac-session-descriptor matcher-fn)
    (log/error "find-joined-session-descriptor called on a session without matcher-fn: " (debug/pprint-session session))))

(defn list-matching-sessions-tags [session]
  (if-let [matcher-fn (get-joined-session-matcher session)]
    (let [decriptors (find-matching-dirac-session-descriptors matcher-fn)]
      (get-dirac-session-descriptors-tags decriptors))))

; -- session matchers -------------------------------------------------------------------------------------------------------

(defn make-substr-matcher-description [substring]
  (str "Dirac session matching substring '" substring "'"))

(defn make-most-recent-matcher-description []
  (str "most recent Dirac session"))

(defn make-regex-matcher-description [re]
  (str "Dirac session matching regex '" re "'"))

(defn make-number-matcher-description [number]
  (str "Dirac session #" number))

(defn make-substr-matcher [substring]
  (fn [session-descriptor _ _]
    (let [tag (prepare-dirac-session-descriptor-tag session-descriptor)]
      (backport-string/includes? tag substring))))

(defn make-most-recent-matcher []
  (fn [_ index cnt]
    (= index (dec cnt))))                                                                                                     ; match last descriptor in the list

(defn make-regex-matcher [re]
  (fn [session-descriptor _ _]
    (some? (re-find re (prepare-dirac-session-descriptor-tag session-descriptor)))))

(defn make-number-matcher [number]
  (let [matching-index (dec number)]
    (fn [_ index _]
      (= index matching-index))))

(defn join-session-with-most-recent-matcher! [session]
  (join-session! session
                 (make-most-recent-matcher)
                 (make-most-recent-matcher-description)))

(defn join-session-with-substr-matcher! [session substring]
  (join-session! session
                 (make-substr-matcher substring)
                 (make-substr-matcher-description substring)))

(defn join-session-with-regex-matcher! [session re]
  (join-session! session
                 (make-regex-matcher re)
                 (make-regex-matcher-description re)))

(defn join-session-with-integer-matcher! [session number]
  (join-session! session
                 (make-number-matcher number)
                 (make-number-matcher-description number)))

(defn get-target-session [session]
  (if-let [target-session-descriptor (find-target-dirac-session-descriptor session)]
    (get-dirac-session-descriptor-session target-session-descriptor)))

(defn get-current-retargeted-session []
  (let [session (state/get-current-session)
        target-session (if (joined-session? session)
                         (get-target-session session))]
    (or target-session session)))
