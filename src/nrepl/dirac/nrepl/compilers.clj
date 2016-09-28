(ns dirac.nrepl.compilers
  (:require [clojure.tools.logging :as log]
            [dirac.logging :as logging]
            [dirac.nrepl.state :as state]
            [dirac.nrepl.sessions :as sessions]
            [dirac.nrepl.figwheel :as figwheel]
            [dirac.nrepl.helpers :as helpers]
            [cljs.env :as cljs-env]))

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

(defn find-compiler-descriptor [id descriptors]
  (some #(if (= (get-compiler-descriptor-id %) id) %) descriptors))

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
  (let [dirac-compilers (mapcat extract-session-compiler-descriptors @state/session-descriptors)
        figwheel-compilers (figwheel/collect-available-compiler-descriptors)]
    (concat figwheel-compilers dirac-compilers)))

(defn compiler-descriptors-ids [descriptors]
  (vec (map get-compiler-descriptor-id descriptors)))

(defn collect-all-available-compiler-ids []
  (compiler-descriptors-ids (collect-all-available-compiler-descriptors)))

(defn find-matching-compiler-descriptor-by-id [descriptor-id]
  (let [descriptors (collect-all-available-compiler-descriptors)]
    (log/debug "available compiler descriptors:" (logging/pprint (compiler-descriptors-ids descriptors)))
    (find-compiler-descriptor descriptor-id descriptors)))                                                                    ; TODO: fuzzy matching

(defn make-announce-ns-msg [ns compiler-id value]
  {:value         (or value "nil")
   :printed-value 1
   :ns            ns
   :compiler-id   (or compiler-id "")})

(defn get-selected-compiler-descriptor []
  (find-matching-compiler-descriptor-by-id (state/get-session-selected-compiler)))

(defn get-selected-compiler-id []
  (get-compiler-descriptor-id (get-selected-compiler-descriptor)))

(defn prepare-announce-ns-msg [ns & [value]]
  (make-announce-ns-msg ns (get-selected-compiler-id) value))

(defn provide-selected-compiler-env* [selected-compiler]
  (if-let [descriptor (find-matching-compiler-descriptor-by-id selected-compiler)]
    (get-compiler-descriptor-compiler-env descriptor)))

(defn provide-selected-compiler-env []
  (provide-selected-compiler-env* (state/get-session-selected-compiler)))

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
