(ns dirac.shared.async
  (:require [cljs.core.async :as core-async]
            [cljs.core]))

; this is our minimal core-async wrapper to promote some naming conventions and maybe prevent usage of some anti-patterns

(def closing-timeouts-is-harmful-msg
  (str "Closing timeout channels considered harmful. See https://groups.google.com/forum/#!topic/clojure-dev/5uIH6iyvM6I."))

(def timeout-marker-sym (symbol "-cljs$core$async$timeout$marker"))

(defmacro <! [& args]
  `(core-async/<! ~@args))

(defmacro put! [& args]
  `(core-async/put! ~@args))

(defmacro take! [& args]
  `(core-async/take! ~@args))

(defmacro close! [port]
  `(let [port# ~port]
     (assert (not (. port# ~timeout-marker-sym)) ~closing-timeouts-is-harmful-msg)                                            ; https://groups.google.com/forum/#!topic/clojure-dev/5uIH6iyvM6I
     (core-async/close! port#)))

(defmacro alts! [& args]
  `(core-async/alts! ~@args))

(defmacro sliding-buffer [& args]
  `(core-async/sliding-buffer ~@args))

(defmacro go [& args]
  `(core-async/go ~@args))

(defmacro gen-setup-timeout-marker [o]
  `(set! (. ~o ~timeout-marker-sym) true))

(defmacro go-wait [& args]
  `(let [timeout-channel# (core-async/timeout ~@args)]
     ; we have to call existing function, because go-wait will be used inside go blocks, which break with set! in them
     (assert (set-timeout-marker! timeout-channel#))
     timeout-channel#))

(defmacro go-channel [& args]
  `(core-async/chan ~@args))

(defmacro go-loop [& _args]
  (let [msg (str "Wait! go-loop usage is not recommended. "
                 "It does not play well with Cursive. "
                 "Please use nested (go (loop ...)) instead.")]
    (throw (ex-info msg {}))))
