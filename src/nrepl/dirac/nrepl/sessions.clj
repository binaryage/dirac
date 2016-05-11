(ns dirac.nrepl.sessions
  (:require [clojure.tools.logging :as log]
            [cljs.analyzer :as ana]
            [dirac.logging :as logging]
            [dirac.nrepl.state :refer [session-descriptors]]
            [dirac.nrepl.state :refer [*cljs-repl-env*
                                       *cljs-compiler-env*
                                       *cljs-repl-options*
                                       *original-clj-ns*]]
            [clojure.tools.nrepl.middleware.interruptible-eval :as nrepl-ieval]
            [dirac.backport.string :as backport-string]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-session-id [session]
  (-> session meta :id))

(defn dirac-session? [session]
  (boolean (@session #'*cljs-repl-env*)))

(defn get-current-session []
  {:post [%]}
  (:session nrepl-ieval/*msg*))

; -- bindings magic ---------------------------------------------------------------------------------------------------------

(defn ensure-bindings! [session]
  ; ensure that bindings exist so cljs-repl can set!
  (if-not (contains? @session #'*cljs-repl-env*)
    (swap! session (partial merge {#'*cljs-repl-env*     *cljs-repl-env*
                                   #'*cljs-compiler-env* *cljs-compiler-env*
                                   #'*cljs-repl-options* *cljs-repl-options*
                                   #'*original-clj-ns*   *original-clj-ns*
                                   #'ana/*cljs-ns*       ana/*cljs-ns*}))))

; -- dirac sessions management ----------------------------------------------------------------------------------------------

(defn make-dirac-session-descriptor [session transport tag]
  {:session   session
   :transport transport
   :tag       tag})

(defn find-dirac-session-descriptor [session]
  (some #(if (= (:session %) session) %) @session-descriptors))

(defn get-dirac-session-descriptor-transport [session-descriptor]
  (:transport session-descriptor))

(defn get-dirac-session-descriptor-session [session-descriptor]
  (:session session-descriptor))

(defn get-dirac-session-descriptor-tag [session-descriptor]
  (:tag session-descriptor))

(defn add-dirac-session-descriptor! [session transport tag]
  (log/debug "add-dirac-session-descriptor!" (get-session-id session) tag)
  (log/trace transport (logging/pprint session))
  (if-not (find-dirac-session-descriptor session)
    (let [session-descriptor (make-dirac-session-descriptor session transport tag)]
      (swap! session-descriptors concat (list session-descriptor)))
    (log/error "attempt to add duplicit session descriptor:\n" (logging/pprint session))))

(defn remove-dirac-session-descriptor! [session]
  (log/debug "remove-remove-dirac-session-descriptor!" (get-session-id session))
  (log/trace (logging/pprint session))
  (if-let [session-descriptor (find-dirac-session-descriptor session)]
    (swap! session-descriptors #(remove #{session-descriptor} %))
    (log/error "attempt to remove unknown session descriptor:\n" (logging/pprint session))))

(defn find-matching-dirac-session-descriptors [matcher]
  (let [descriptors @session-descriptors
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
    (str sanitized-tag " [" session-id "]")))

(defn get-dirac-session-descriptors-tags [session-descriptors]
  (map prepare-dirac-session-descriptor-tag session-descriptors))

(defn get-dirac-session-tag [session]
  (prepare-dirac-session-descriptor-tag (find-dirac-session-descriptor session)))

(defn get-dirac-session-tags []
  (get-dirac-session-descriptors-tags @session-descriptors))

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
    (log/error "find-joined-session-descriptor called on a session without matcher-fn:\n"
               (logging/pprint session))))

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

(defn join-session-with-number-matcher! [session number]
  (join-session! session
                 (make-number-matcher number)
                 (make-number-matcher-description number)))

; -- sessions state ---------------------------------------------------------------------------------------------------------

(defn get-session-type [session]
  (cond
    (dirac-session? session)
    (str "a Dirac session (ClojureScript).\n"
         "This session is connected to '" (get-dirac-session-tag session) "'")

    (joined-session? session)
    (str "a joined Dirac session (ClojureScript).\n"
         "This session targets " (get-target-session-info session))

    :else
    (str "a normal session (Clojure)")))