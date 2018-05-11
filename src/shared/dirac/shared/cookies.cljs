; taken from https://github.com/Quantisan/cljs-cookies/blob/4963df43bd4b025f34a34be7b6b37b11fb69d278/src/cljs_cookies/core.cljs
(ns dirac.shared.cookies
  (:refer-clojure :exclude [empty?])
  (:require [oops.core :refer [gcall oapply ocall ocall! oget oset!]])
  (:import goog.net.Cookies))

(def cookies (Cookies. js/document))

(defn make-key-name [k]
  (name k))

(defn set-cookie [k v & opts]
  "Sets a cookie.
   Options:
   max-age -- The max age in seconds (from now). Use -1 to set a session cookie. If not provided, the default is -1 (i.e. set a session cookie).
   "
  (let [key-name (make-key-name k)]
    (when (ocall cookies "isValidName" key-name)
      (when (ocall cookies "isValidValue" v)
        (let [{:keys [max-age path domain secure?]} (apply hash-map opts)]
          (ocall! cookies "set" key-name v max-age path domain secure?))))))

(defn get-cookie [k]
  "Returns the value for the first cookie with the given key."
  (let [key-name (make-key-name k)]
    (ocall cookies "get" key-name nil)))

(defn remove-cookie [k]
  "Removes and expires a cookie."
  (let [key-name (make-key-name k)]
    (ocall cookies "remove" key-name)))

(defn enabled?
  ([] (enabled? cookies))
  ([c] (ocall c "isEnabled")))

(defn empty?
  ([] (empty? cookies))
  ([c] (ocall c "isEmpty")))
