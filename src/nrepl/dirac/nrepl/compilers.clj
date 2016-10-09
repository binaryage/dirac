(ns dirac.nrepl.compilers
  (:require [clojure.tools.logging :as log]
            [cljs.env :as cljs-env]
            [dirac.logging :as logging]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.figwheel :as figwheel]
            [dirac.nrepl.protocol :as protocol])
  (:import (java.util.regex Pattern)))

(defn make-compiler-id [session-id number]
  (let [short-session-id (sessions/humanize-session-id session-id)]
    (str "dirac" "/" short-session-id "." number)))

; -- compiler management ----------------------------------------------------------------------------------------------------

(defn make-compiler-descriptor [id compiler-env]
  {:id           id
   :compiler-env compiler-env})

(defn get-compiler-descriptor-compiler-env [descriptor]
  (:compiler-env descriptor))

(defn get-compiler-descriptor-id [descriptor]
  (:id descriptor))

(defn compiler-descriptors-ids [descriptors]
  (map get-compiler-descriptor-id descriptors))

(defn filter-compiler-descriptors-by-first-match [descriptors]
  (if-let [descriptor (first descriptors)]
    (list descriptor)
    (list)))

(defn filter-compiler-descriptors-by-position [n descriptors]
  (if-let [descriptor (nth descriptors (dec n) nil)]                                                                          ; user input is 1-based
    (list descriptor)
    (list)))

(defn filter-compiler-descriptors-by-id [id descriptors]
  (filter #(if (= (get-compiler-descriptor-id %) id) %) descriptors))

(defn filter-compiler-descriptors-by-regexp [re descriptors]
  (filter #(if (re-matches re (get-compiler-descriptor-id %)) %) descriptors))

(defn filter-compiler-descriptors-by-substring [match descriptors]
  (filter #(if (.contains (get-compiler-descriptor-id %) match) %) descriptors))

(defn filter-matching-compiler-descriptors [match descriptors]
  (cond
    (nil? match) (filter-compiler-descriptors-by-first-match descriptors)
    (integer? match) (filter-compiler-descriptors-by-position match descriptors)
    (string? match) (filter-compiler-descriptors-by-substring match descriptors)
    (instance? Pattern match) (filter-compiler-descriptors-by-regexp match descriptors)
    :else (assert nil (str "invalid match in filter-matching-compiler-descriptors: " (type match)))))

(defn find-compiler-descriptor-by-first-match [descriptors]
  (first (filter-compiler-descriptors-by-first-match descriptors)))

(defn find-compiler-descriptor-by-id [id descriptors]
  (first (filter-compiler-descriptors-by-id id descriptors)))

(defn find-compiler-descriptor-by-regexp [re descriptors]
  (first (filter-compiler-descriptors-by-regexp re descriptors)))

(defn find-compiler-descriptor-by-substring [match descriptors]
  (first (filter-compiler-descriptors-by-substring match descriptors)))

(defn find-compiler-descriptor-by-position [n descriptors]
  (first (filter-compiler-descriptors-by-position n descriptors)))

(defn find-matching-compiler-descriptor [match descriptors]
  (first (filter-matching-compiler-descriptors match descriptors)))

(defn register-compiler-descriptor! [session descriptor]
  (let [new-descriptors (conj (or (state/get-session-compiler-descriptors session) []) descriptor)]
    (state/set-session-compiler-descriptors! session new-descriptors)))

(defn unregister-compiler-descriptor! [session id]
  (let [new-descriptors (remove #(= (get-compiler-descriptor-id %) id) (state/get-session-compiler-descriptors session))]
    (state/set-session-compiler-descriptors! session (vec new-descriptors))))

(defn extract-session-compiler-descriptors [session-descriptor]
  (let [session (sessions/get-dirac-session-descriptor-session session-descriptor)]
    (state/get-session-compiler-descriptors session)))

; -- all compilers in the process -------------------------------------------------------------------------------------------

(defn collect-all-available-compiler-descriptors [session]
  (let [session-compilers (state/get-session-compiler-descriptors session)
        other-sessions-descriptors (sessions/get-other-sessions-descriptors session)
        other-sessions-compilers (mapcat extract-session-compiler-descriptors other-sessions-descriptors)
        figwheel-compilers (figwheel/collect-available-compiler-descriptors)]
    (concat session-compilers other-sessions-compilers figwheel-compilers)))                                                  ; order is important here, we are matching compilers in this order

(defn filter-available-matching-compiler-descriptors [session match]
  (let [descriptors (collect-all-available-compiler-descriptors session)]
    (log/trace "available compiler descriptors:" (logging/pprint (compiler-descriptors-ids descriptors)))
    (filter-matching-compiler-descriptors match descriptors)))

(defn find-available-matching-compiler-descriptor [session match]
  (first (filter-available-matching-compiler-descriptors session match)))

(defn get-selected-compiler-descriptor [session]
  (if (some? session)
    (if (state/dirac-session? session)
      (find-available-matching-compiler-descriptor session (state/get-session-selected-compiler session)))))

(defn get-selected-compiler-id [session]
  (if (some? session)
    (if (state/dirac-session? session)
      (get-compiler-descriptor-id (get-selected-compiler-descriptor session)))))

(defn get-selected-compiler-env [session]
  (if (some? session)
    (if (state/dirac-session? session)
      (get-compiler-descriptor-compiler-env (get-selected-compiler-descriptor session)))))

(defn get-default-compiler-descriptor [session]
  (first (state/get-session-compiler-descriptors session)))

(defn get-default-compiler-id [session]
  (get-compiler-descriptor-id (get-default-compiler-descriptor session)))

(defn get-next-compiler-number-for-session! [session]
  (let [last-number (or (state/get-session-last-compiler-number session) 0)
        next-number (inc last-number)]
    (state/set-session-last-compiler-number! session next-number)
    next-number))

(defn capture-current-compiler! [session]
  (let [session-id (state/get-session-id)]
    (log/trace "capture-current-compiler-and-select-it!" session-id)
    (assert cljs-env/*compiler*)
    (let [compiler-id (make-compiler-id session-id (get-next-compiler-number-for-session! session))
          compiler-descriptor (make-compiler-descriptor compiler-id cljs-env/*compiler*)]
      (register-compiler-descriptor! session compiler-descriptor))))
