(ns dirac.nrepl.state
  (:require [clojure.tools.logging :as log]
            [dirac.utils :as utils]
            [dirac.nrepl.helpers :as helpers]
            [dirac.nrepl.messages :as messages]))

; -- global state -----------------------------------------------------------------------------------------------------------

; here we keep a map of all bootstrapped Dirac sessions
(def session-descriptors (atom '()))

; this map will grow indefinitely, it is just a list of strings, not worth recollecting
(def selected-compilers-of-dead-sessions (atom {}))                                                                           ; session-id -> compiler-id matching strategy (string)

; here we maintain a list of in-progress jobs which want to be echo-ed back to joined-session
(def observed-jobs (atom {}))

(def sniffer->proxy (atom {}))

; -- dirac! eval state ------------------------------------------------------------------------------------------------------

(def ^:dynamic *nrepl-message*)                                                                                               ; should be set by binding in repl-eval!

(defn send-response! [msg]
  (assert *nrepl-message*)
  (helpers/send-response! *nrepl-message* msg))

; -- session-specific state -------------------------------------------------------------------------------------------------

; we cannot pass session info into all our functions,
; so we keep some global state around and various functions touch it at will

(def ^:dynamic *current-session* nil)

; -- convenience macros -----------------------------------------------------------------------------------------------------

(defmacro ensure-session [session & body]
  `(do
     (assert (nil? *current-session*))
     (binding [*current-session* ~session]
       ~@body)))

; -- in-flight message for bootstrapping ------------------------------------------------------------------------------------

; this is only for bootstrapping Dirac CLJS REPL,
; we want to avoid depending directly on nrepl.middleware.interruptible-eval/*msg*
; please note that the machinery in interruptible-eval is async, the actual message processing could be executed
; when leave our stack frame, that is why cannot use simple binding and we have to use session's binding map
(def ^:dynamic *last-seen-nrepl-message* nil)

(defn register-last-seen-nrepl-message!
  ([nrepl-message]
   (if (some? *current-session*)
     (register-last-seen-nrepl-message! *current-session* nrepl-message)
     (log/error (messages/make-missing-nrepl-session-msg nrepl-message))))
  ([session nrepl-message]
   (swap! session assoc #'*last-seen-nrepl-message* nrepl-message)))

(defn get-last-seen-nrepl-message []
  *last-seen-nrepl-message*)

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn has-session? []
  (some? *current-session*))

(defn get-current-session []
  (assert *current-session*)
  *current-session*)

(defn get-current-session-if-avail []
  *current-session*)

(defn get-session-binding-value
  ([var] (get-session-binding-value *current-session* var))
  ([session var]
   (assert session)
   (get @session var)))

; implemented in session nREPL middleware
(defn get-session-id
  ([] (get-session-id *current-session*))
  ([session]
   (assert session)
   (-> session meta :id)))

(defn get-session-cljs-repl-env
  ([] (get-session-cljs-repl-env *current-session*))
  ([session]
   (assert session)
   (-> session meta ::cljs-repl-env)))

(defn set-session-cljs-repl-env!
  ([cljs-repl-env] (set-session-cljs-repl-env! *current-session* cljs-repl-env))
  ([session cljs-repl-env]
   (assert session)
   (log/debug (str "set-session-cljs-repl-env! " (get-session-id session) " => " (utils/pp cljs-repl-env)))
   (alter-meta! session assoc ::cljs-repl-env cljs-repl-env)))

(defn dirac-session?
  ([] (dirac-session? *current-session*))
  ([session]
   (assert session)
   (some? (get-session-cljs-repl-env session))))

(defn get-session-selected-compiler
  ([] (get-session-selected-compiler *current-session*))
  ([session]
   (assert session)
   (-> session meta ::selected-compiler)))

(defn set-session-selected-compiler!
  ([selected-compiler] (set-session-selected-compiler! *current-session* selected-compiler))
  ([session selected-compiler]
   (assert session)
   (log/debug "setting session selected compiler" (get-session-id session) selected-compiler)
   (alter-meta! session assoc ::selected-compiler selected-compiler)))

(defn get-session-compiler-descriptors
  ([] (get-session-compiler-descriptors *current-session*))
  ([session]
   (assert session)
   (-> session meta ::compiler-descriptors)))

(defn set-session-compiler-descriptors!
  ([compiler-descriptors] (set-session-compiler-descriptors! *current-session* compiler-descriptors))
  ([session compiler-descriptors]
   (assert session)
   (log/debug (str "set-session-compiler-descriptors! " (get-session-id session) " => " (utils/pp compiler-descriptors)))
   (alter-meta! session assoc ::compiler-descriptors compiler-descriptors)))

(defn get-session-cljs-repl-options
  ([] (get-session-cljs-repl-options *current-session*))
  ([session]
   (assert session)
   (-> session meta ::cljs-repl-options)))

(defn set-session-cljs-repl-options!
  ([cljs-repl-options] (set-session-cljs-repl-options! *current-session* cljs-repl-options))
  ([session cljs-repl-options]
   (assert session)
   (log/debug (str "set-session-cljs-repl-options! " (get-session-id session) " => " (utils/pp cljs-repl-options)))
   (alter-meta! session assoc ::cljs-repl-options cljs-repl-options)))

(defn get-session-original-clj-ns
  ([] (get-session-original-clj-ns *current-session*))
  ([session]
   (assert session)
   (-> session meta ::original-clj-ns)))

(defn set-session-original-clj-ns!
  ([original-clj-ns] (set-session-original-clj-ns! *current-session* original-clj-ns))
  ([session original-clj-ns]
   (assert session)
   (log/debug (str "set-session-original-clj-ns! " (get-session-id session) " => " (utils/pp original-clj-ns)))
   (alter-meta! session assoc ::original-clj-ns original-clj-ns)))

(defn get-session-cljs-ns
  ([] (get-session-cljs-ns *current-session*))
  ([session]
   (assert session)
   (-> session meta ::cljs-ns)))

(defn set-session-cljs-ns!
  ([cljs-ns] (set-session-cljs-ns! *current-session* cljs-ns))
  ([session cljs-ns]
   (assert session)
   (log/debug (str "set-session-cljs-ns! " (get-session-id session) " => " (utils/pp cljs-ns)))
   (alter-meta! session assoc ::cljs-ns cljs-ns)))

(defn get-session-last-compiler-number
  ([] (get-session-last-compiler-number *current-session*))
  ([session]
   (assert session)
   (-> session meta ::last-compiler-number)))

(defn set-session-last-compiler-number!
  ([n] (set-session-last-compiler-number! *current-session* n))
  ([session n]
   (assert session)
   (log/debug (str "set-session-last-compiler-number! " (get-session-id session) " => " n))
   (alter-meta! session assoc ::last-compiler-number n)))

(defn get-session-dirac-nrepl-config
  ([] (get-session-dirac-nrepl-config *current-session*))
  ([session]
   (assert session)
   (-> session meta ::dirac-nrepl-config)))

(defn set-session-dirac-nrepl-config!
  ([dirac-nrepl-config] (set-session-dirac-nrepl-config! *current-session* dirac-nrepl-config))
  ([session dirac-nrepl-config]
   (assert session)
   (log/debug (str "set-session-dirac-nrepl-config! " (get-session-id session) " => " (utils/pp dirac-nrepl-config)))
   (alter-meta! session assoc ::dirac-nrepl-config dirac-nrepl-config)))

(defn get-session-meta
  ([] (get-session-meta *current-session*))
  ([session]
   (assert session)
   (-> session meta)))

(defn set-session-meta!
  ([meta] (set-session-meta! *current-session* meta))
  ([session meta]
   (assert session)
   (reset-meta! session meta)))

(defn register-selected-compiler-for-dead-session! [session-id selected-compiler]
  (log/debug (str "register-selected-compiler-for-dead-session! " session-id " => " (utils/pp selected-compiler)))
  (swap! selected-compilers-of-dead-sessions assoc session-id selected-compiler))

(defn get-selected-compiler-of-dead-session [session-id]
  (get @selected-compilers-of-dead-sessions session-id nil))
