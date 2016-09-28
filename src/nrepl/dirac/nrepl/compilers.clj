(ns dirac.nrepl.compilers
  (:require [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.figwheel :as figwheel]
            [cljs.env :as cljs-env])
  (:import (java.util.regex Pattern)))

(defn select-compiler! [id]
  (state/set-session-selected-compiler! id))

; -- compiler management ----------------------------------------------------------------------------------------------------

(defn make-compiler-descriptor [id compiler-env]
  {:id           id
   :compiler-env compiler-env})

(defn get-compiler-descriptor-compiler-env [descriptor]
  (:compiler-env descriptor))

(defn get-compiler-descriptor-id [descriptor]
  (:id descriptor))

(defn find-compiler-descriptor-by-id [id descriptors]
  (some #(if (= (get-compiler-descriptor-id %) id) %) descriptors))

(defn find-compiler-descriptor-by-regexp [re descriptors]
  (some #(if (re-matches re (get-compiler-descriptor-id %)) %) descriptors))

(defn find-compiler-descriptor-by-substring [match descriptors]
  (some #(if (.contains (get-compiler-descriptor-id %) match) %) descriptors))

(defn find-matching-compiler-descriptor [match descriptors]
  (cond
    (nil? match) (first descriptors)
    (integer? match) (nth descriptors (dec match) nil)                                                                        ; user input is 1-based
    (string? match) (find-compiler-descriptor-by-substring match descriptors)
    (instance? Pattern match) (find-compiler-descriptor-by-regexp match descriptors)
    :else (assert nil (str "invalid match in find-matching-compiler-descriptor: " (type match)))))

(defn register-compiler-descriptor! [descriptor]
  (state/set-session-compiler-descriptors! (conj (or (state/get-session-compiler-descriptors) []) descriptor)))

(defn unregister-compiler-descriptor! [id]
  (let [new-descriptors (remove #(= (get-compiler-descriptor-id %) id) (state/get-session-compiler-descriptors))]
    (state/set-session-compiler-descriptors! (vec new-descriptors))))

(defn extract-session-compiler-descriptors [session-descriptor]
  (let [session (sessions/get-dirac-session-descriptor-session session-descriptor)]
    (state/get-session-compiler-descriptors session)))

; -- all compilers in the process -------------------------------------------------------------------------------------------

(defn collect-all-available-compiler-descriptors []
  (let [session-compilers (state/get-session-compiler-descriptors)
        other-sessions-compilers (mapcat extract-session-compiler-descriptors (sessions/get-other-sessions-descriptors))
        figwheel-compilers (figwheel/collect-available-compiler-descriptors)]
    (concat session-compilers other-sessions-compilers figwheel-compilers)))                                                  ; order is important here, we are matching compilers in this order

(defn compiler-descriptors-ids [descriptors]
  (vec (map get-compiler-descriptor-id descriptors)))

(defn collect-all-available-compiler-ids []
  (compiler-descriptors-ids (collect-all-available-compiler-descriptors)))

(defn find-available-compiler-descriptor-by-id [descriptor-id]
  (let [descriptors (collect-all-available-compiler-descriptors)]
    (log/debug "available compiler descriptors:" (logging/pprint (compiler-descriptors-ids descriptors)))
    (find-compiler-descriptor-by-id descriptor-id descriptors)))

(defn find-available-matching-compiler-descriptor [match]
  (let [descriptors (collect-all-available-compiler-descriptors)]
    (log/debug "available compiler descriptors:" (logging/pprint (compiler-descriptors-ids descriptors)))
    (find-matching-compiler-descriptor match descriptors)))

(defn make-announce-ns-msg [ns compiler-id value]
  {:value         (or value "nil")
   :printed-value 1
   :ns            ns
   :compiler-id   (or compiler-id "")})

(defn get-selected-compiler-descriptor []
  (if (state/dirac-session?)
    (find-available-matching-compiler-descriptor (state/get-session-selected-compiler))))

(defn get-selected-compiler-id []
  (get-compiler-descriptor-id (get-selected-compiler-descriptor)))

(defn prepare-announce-ns-msg [ns & [value]]
  (make-announce-ns-msg ns (get-selected-compiler-id) value))

(defn get-selected-compiler-env []
  (get-compiler-descriptor-compiler-env (get-selected-compiler-descriptor)))

(defn get-next-compiler-number-for-session! []
  (let [last-number (or (state/get-session-last-compiler-number) 0)
        next-number (inc last-number)]
    (state/set-session-last-compiler-number! next-number)
    next-number))

(defn capture-current-compiler-and-select-it! []
  (let [session-id (state/get-session-id)]
    (log/debug "capture-current-compiler-and-select-it!" session-id)
    (assert cljs-env/*compiler*)
    (let [short-session-id (sessions/humanize-session-id session-id)
          compiler-id (str "dirac" "/" short-session-id "/" (get-next-compiler-number-for-session!))
          compiler-descriptor (make-compiler-descriptor compiler-id cljs-env/*compiler*)]
      (register-compiler-descriptor! compiler-descriptor)
      (select-compiler! (get-compiler-descriptor-id compiler-descriptor)))))
