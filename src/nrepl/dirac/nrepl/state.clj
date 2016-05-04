(ns dirac.nrepl.state)

; -- state ------------------------------------------------------------------------------------------------------------------

; we cannot pass nrepl-message info into all our functions,
; so we keep some global state around and various functions touch it at will

(def ^:dynamic *cljs-repl-env* nil)                                                                                           ; this is the var that is checked by the middleware to determine whether an active CLJS REPL is in flight
(def ^:dynamic *cljs-compiler-env* nil)
(def ^:dynamic *cljs-repl-options* nil)
(def ^:dynamic *original-clj-ns* nil)

; here we keep a map of all bootstrapped Dirac sessions
(def session-descriptors (atom '()))

; here we maintain a list of in-progress jobs which want to be echo-ed back to joined-session
(def observed-jobs (atom {}))

(def sniffer->proxy (atom {}))
