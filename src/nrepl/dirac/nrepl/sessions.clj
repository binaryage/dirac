(ns dirac.nrepl.sessions
  (:require [clojure.tools.logging :as log]
            [dirac.logging :as logging]))

; here we keep a map of all bootstrapped dirac CLJS sessions
; also we provide a mechanism for observing adding/removing sessions

(defonce session-observers (atom []))
(defonce session-records (atom {}))                                                                                           ; session -> {:session :tag ...}

; -- observers --------------------------------------------------------------------------------------------------------------

(defn find-observer [key]
  (some #(= key (:key %)) @session-observers))

(defn register-observer! [key handler]
  {:pre [(fn? handler)]}
  (if-not (find-observer key)
    (swap! session-observers conj {:key key :handler handler})
    (log/error "attempt to register an observer with duplicit key" key)))

(defn unregister-observer! [key]
  (if (find-observer key)
    (swap! session-observers (fn [observers]
                               (remove #(= key (:key %)) observers)))
    (log/error "attempt to unregister unknown observer with key" key)))

(defn notify-observers! [action session-record]
  (doseq [observer @session-observers]
    (let [{:keys [handler]} observer]
      (handler action session-record))))

; -- session management -----------------------------------------------------------------------------------------------------

(defn add-session! [session tag]
  (log/debug "add-session!" tag "\n" (logging/pprint session))
  (if-not (get @session-records session-records)
    (let [session-record {:session session :tag tag}]
      (swap! session-records assoc session session-record)
      (notify-observers! :dirac-session-added session-record))
    (log/error "attempt to add duplicit session:\n" (logging/pprint session))))

(defn remove-session! [session]
  (log/debug "remove-session!\n" (logging/pprint session))
  (if-let [sesison-record (get @session-records session)]
    (do
      (swap! session-records dissoc session)
      (notify-observers! :dirac-session-removed sesison-record))
    (log/error "attempt to remove unknown session:\n" (logging/pprint session))))