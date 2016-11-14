; taken from https://github.com/Quantisan/cljs-cookies/blob/4963df43bd4b025f34a34be7b6b37b11fb69d278/src/cljs_cookies/core.cljs
(ns dirac.cookies
  (:refer-clojure :exclude [empty?])
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
    (if (.isValidName cookies key-name)
      (if (.isValidValue cookies v)
        (let [{:keys [max-age path domain secure?]} (apply hash-map opts)]
          (.set cookies key-name v max-age path domain secure?))))))

(defn get-cookie [k]
  "Returns the value for the first cookie with the given key."
  (let [key-name (make-key-name k)]
    (.get cookies key-name nil)))

(defn remove-cookie [k]
  "Removes and expires a cookie."
  (let [key-name (make-key-name k)]
    (.remove cookies key-name)))

(defn enabled?
  ([] (enabled? cookies))
  ([c] (.isEnabled c)))

(defn empty?
  ([] (empty? cookies))
  ([c] (.isEmpty c)))
