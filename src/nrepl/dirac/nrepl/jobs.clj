(ns dirac.nrepl.jobs
  (:require [clojure.tools.logging :as log]
            [dirac.nrepl.state :refer [observed-jobs]]
            [dirac.logging :as logging]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn get-observed-job [nrepl-message]
  (get @observed-jobs (:id nrepl-message)))

(defn observed-job? [nrepl-message]
  (some? (get-observed-job nrepl-message)))

(defn make-observed-job [job-id original-id interested-session interested-transport]
  {:id                   job-id
   :original-id          original-id
   :interested-session   interested-session
   :interested-transport interested-transport})

(defn get-observed-job-session [observed-job]
  (:interested-session observed-job))

(defn get-observed-job-transport [observed-job]
  (:interested-transport observed-job))

(defn get-observed-job-id [observed-job]
  (:id observed-job))

(defn get-observed-job-message-id [observed-job]
  (:original-id observed-job))

(defn register-observed-job! [job-id original-id interested-session interested-transport timeout-ms]
  (log/debug "register-observed-job!"
             (str "job-id=" job-id)
             (str "original-message-id=" original-id)
             (str "timeout=" timeout-ms))
  (log/trace original-id timeout-ms (logging/pprint interested-session) interested-transport)
  ; TODO: implement timeouts
  (swap! observed-jobs assoc job-id (make-observed-job job-id original-id interested-session interested-transport)))

(defn unregister-observed-job! [job-id]
  (log/debug "unregister-observed-job!"
             (str "job-id=" job-id))
  (log/trace (logging/pprint (get @observed-jobs job-id)))
  (swap! observed-jobs dissoc job-id))
