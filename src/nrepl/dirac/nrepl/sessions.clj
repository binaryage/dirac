(ns dirac.nrepl.sessions
  (:require [clojure.tools.logging :as log]
            [cljs.analyzer :as ana]
            [dirac.logging :as logging]
            [dirac.nrepl.state :refer [session-descriptors]]
            [dirac.nrepl.state :refer [*cljs-repl-env* *cljs-compiler-env* *cljs-repl-options* *original-clj-ns*]]
            [clojure.tools.nrepl.middleware.interruptible-eval :as nrepl-ieval]))


; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn in-cljs-repl? [session]
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

(defn find-matching-session-descriptor [matcher]
  (some #(if (matcher %) %) @session-descriptors))

(defn get-user-friendly-session-descriptor-tag [session]
  (or (:tag (find-session-descriptor session)) "?"))

; -- joining sessions -------------------------------------------------------------------------------------------------------

(defn has-joined-session? [session]
  (boolean (::joined-session-matcher @session)))

(defn join-session! [session matcher]
  (if (some? matcher)
    (swap! session assoc ::joined-session-matcher matcher)
    (swap! session dissoc ::joined-session-matcher)))

(defn disjoin-session! [session]
  (join-session! session nil))

(defn find-joined-session-descriptor [session]
  (if-let [matcher (::joined-session-matcher session)]
    (find-matching-session-descriptor matcher)
    (log/error "find-joined-session-descriptor called on session without ::joined-session-matcher:\n"
               (logging/pprint session))))