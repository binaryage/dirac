(ns dirac.automation.scenario
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error]]
            [cljs.pprint :refer [pprint]]
            [dirac.utils]
            [dirac.automation.messages :as messages]
            [dirac.automation.notifications :as notifications]
            [dirac.utils :as utils]))

(defonce triggers (atom {}))                                                                                                  ; trigger-name -> callback
(defonce original-console-api (atom nil))
(defonce feedback-transformers (atom []))                                                                                     ; a list of fns string -> string

; -- console output transformers --------------------------------------------------------------------------------------------

(defn register-feedback-transformer! [transformer]
  (swap! feedback-transformers conj transformer))

(defn unregister-feedback-transformer! [transformer]
  (swap! feedback-transformers #(remove (fn [item] (= item transformer)) %)))

(defn transform-feedback [input]
  (let [xform (fn [acc val] (val acc))]
    (reduce xform input @feedback-transformers)))

(defn feedback! [transcript & [label]]
  (messages/post-scenario-feedback! (transform-feedback transcript) label))

; -- triggers ---------------------------------------------------------------------------------------------------------------

(defn register-trigger! [name callback]
  (swap! triggers assoc (keyword name) callback)
  (log "registered trigger" name))

(defn unregister-trigger! [name]
  (swap! triggers dissoc (keyword name))
  (log "unregistered trigger" name))

(defn call-trigger! [name data]
  (if-let [trigger-fn (get @triggers (keyword name))]
    (trigger-fn data)
    (warn "unrecognized trigger " name " when processing " data)))

; -- handling exceptions ----------------------------------------------------------------------------------------------------

(defn scenario-exception-handler! [_message _source _lineno _colno e]
  (feedback! (str "uncaught exception: " (utils/extract-first-line (utils/format-error e))))
  false)

(defn register-global-exception-handler! []
  (oset js/window ["onerror"] scenario-exception-handler!))

; -- notification handler ---------------------------------------------------------------------------------------------------

(defn notification-handler! [notification]
  (if-let [trigger-name (:trigger notification)]
    (call-trigger! trigger-name notification)))

; -- facades ----------------------------------------------------------------------------------------------------------------

(defn ready! []
  (messages/init! "scenario")
  (notifications/init!)
  (register-global-exception-handler!)
  (notifications/subscribe-notifications! notification-handler!)
  (messages/send-scenario-ready!))

; -- capturing console output -----------------------------------------------------------------------------------------------

(defn console-handler [orig kind & args]
  (let [transcript (str kind args)]
    (feedback! transcript (str "scenario out"))
    (.apply orig js/console (to-array args))))

(defn store-console-api []
  {"log"   (oget js/window "console" "log")
   "warn"  (oget js/window "console" "warn")
   "info"  (oget js/window "console" "info")
   "error" (oget js/window "console" "error")})

(defn captured-console-api [original-api]
  {"log"   (partial console-handler (get original-api "log") "LOG: ")
   "warn"  (partial console-handler (get original-api "warn") "WARN: ")
   "info"  (partial console-handler (get original-api "info") "INFO: ")
   "error" (partial console-handler (get original-api "error") "ERROR: ")})

(defn set-console-api! [api]
  (oset js/window ["console" "log"] (get api "log"))
  (oset js/window ["console" "warn"] (get api "warn"))
  (oset js/window ["console" "info"] (get api "info"))
  (oset js/window ["console" "error"] (get api "error")))

(defn capture-console-as-feedback! []
  {:pre [(nil? @original-console-api)]}
  (reset! original-console-api (store-console-api))
  (set-console-api! (captured-console-api @original-console-api)))

(defn uncapture-console-as-feedback! []
  {:pre [(some? @original-console-api)]}
  (set-console-api! @original-console-api)
  (reset! original-console-api nil))
