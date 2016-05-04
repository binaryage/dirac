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
            [clojure.string :as string]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

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

; -- session descriptor management ------------------------------------------------------------------------------------------

(defn find-session-descriptor [session]
  (some #(if (= (:session %) session) %) @session-descriptors))

(defn add-session-descriptor! [session tag]
  (log/debug "add-session!" tag "\n" (logging/pprint session))
  (if-not (find-session-descriptor session)
    (let [session-descriptor {:session session :tag tag}]
      (swap! session-descriptors concat (list session-descriptor)))
    (log/error "attempt to add duplicit session descriptor:\n" (logging/pprint session))))

(defn remove-session-descriptor! [session]
  (log/debug "remove-session!\n" (logging/pprint session))
  (if-let [session-descriptor (find-session-descriptor session)]
    (swap! session-descriptors #(remove #{session-descriptor} %))
    (log/error "attempt to remove unknown session descriptor:\n" (logging/pprint session))))

(defn find-matching-session-descriptors [matcher]
  (let [descriptors @session-descriptors
        descriptors-count (count descriptors)
        match-result (fn [i d]
                       (if (matcher d i descriptors-count) d))]
    (keep-indexed match-result descriptors)))

(defn find-matching-session-descriptor [matcher]
  (first (find-matching-session-descriptors matcher)))

(defn make-user-friendly-tag [tag]
  (if (empty? tag) "?" tag))

(defn get-user-friendly-tags [session-descriptors]
  (map #(make-user-friendly-tag (:tag %)) session-descriptors))

(defn get-user-friendly-session-descriptor-tag [session]
  (make-user-friendly-tag (:tag (find-session-descriptor session))))

(defn get-user-friendly-session-tags []
  (get-user-friendly-tags @session-descriptors))

; -- joining sessions -------------------------------------------------------------------------------------------------------

(defn make-joined-session-descriptor [matcher-fn info]
  {:matcher matcher-fn
   :info    info})

(defn get-joined-session-descriptor [session]
  (::joined-session-descriptor (meta session)))

(defn get-joined-session-matcher [session]
  (:matcher (get-joined-session-descriptor session)))

(defn get-joined-session-info [session]
  (:info (get-joined-session-descriptor session)))

(defn joined-session? [session]
  (some? (get-joined-session-descriptor session)))

(defn join-session! [session matcher & [info]]
  {:pre [(some? matcher)]}
  (alter-meta! session assoc ::joined-session-descriptor (make-joined-session-descriptor matcher info)))

(defn disjoin-session! [session]
  (alter-meta! session dissoc ::joined-session-descriptor))

(defn find-joined-session-descriptor [session]
  (if-let [matcher-fn (get-joined-session-matcher session)]
    (find-matching-session-descriptor matcher-fn)
    (log/error "find-joined-session-descriptor called on session without matcher-fn:\n"
               (logging/pprint session))))

(defn list-matching-sessions-tags [session]
  (if-let [matcher-fn (get-joined-session-matcher session)]
    (let [decriptors (find-matching-session-descriptors matcher-fn)]
      (get-user-friendly-tags decriptors))))

; -- session matchers -------------------------------------------------------------------------------------------------------

(defn make-substr-matcher-description [substring]
  (str "Dirac session matching substring '" substring "'"))

(defn make-most-recent-matcher-description []
  (str "most recent Dirac session"))

(defn make-regex-matcher-description [re]
  (str "Dirac session matching regex " re))

(defn make-number-matcher-description [number]
  (str "Dirac session #" number))

(defn make-substr-matcher [substring]
  (fn [session-descriptor _ _]
    (let [tag (:tag session-descriptor)]
      (boolean (string/index-of tag substring)))))

(defn make-most-recent-matcher []
  (fn [_session-descriptor index cnt]
    (= index (dec cnt))))

(defn make-regex-matcher [re]
  (fn [session-descriptor _ _]
    (some? (re-find re (:tag session-descriptor)))))

(defn make-number-matcher [number]
  (fn [_ index _]
    (= index number)))

(defn join-session-with-most-recent-matcher! [session]
  (join-session! session (make-most-recent-matcher) (make-most-recent-matcher-description)))

(defn join-session-with-substr-matcher! [session substring]
  (join-session! session (make-substr-matcher substring) (make-substr-matcher-description substring)))

(defn join-session-with-regex-matcher! [session re]
  (join-session! session (make-regex-matcher re) (make-regex-matcher-description re)))

(defn join-session-with-number-matcher! [session number]
  (join-session! session (make-number-matcher number) (make-number-matcher-description number)))

; -- sessions state ---------------------------------------------------------------------------------------------------------

(defn get-session-type [session]
  (cond
    (dirac-session? session)
    (str "a Dirac session (ClojureScript).\n"
         "The session is connected to '" (get-user-friendly-session-descriptor-tag session) "'")

    (joined-session? session)
    (str "a joined Dirac session (ClojureScript).\n"
         "The target session is matched to " (get-joined-session-info session) ".")

    :else
    (str "a normal session (Clojure)")))