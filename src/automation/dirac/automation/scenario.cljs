(ns dirac.automation.scenario
  (:require-macros [dirac.automation.scenario])
  (:require [dirac.automation.feedback :as feedback]
            [dirac.automation.logging :refer [error info log warn]]
            [dirac.automation.messages :as messages]
            [dirac.automation.notifications :as notifications]                                                                                              ; used in macros
            [dirac.shared.async :refer [<! go]]                                                                                             ; used in macros
            [dirac.shared.pprint]
            [dirac.shared.utils]
            [dirac.shared.utils :as utils]
            [oops.core :refer [gcall! gget gset! oapply ocall oget oset!]]))

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

(defn go-post-feedback! [transcript & [label]]
  (messages/go-post-scenario-feedback! (transform-feedback transcript) label))

; -- triggers ---------------------------------------------------------------------------------------------------------------

(defn register-trigger! [name callback]
  (swap! triggers assoc (keyword name) callback))

(defn unregister-trigger! [name]
  (swap! triggers dissoc (keyword name)))

(defn call-trigger! [name args]
  (if-let [trigger-fn (get @triggers (keyword name))]
    (apply trigger-fn args)
    (warn "unrecognized trigger " name " when processing " args)))

; -- handling exceptions ----------------------------------------------------------------------------------------------------

(defn handle-scenario-exception! [_message _source _lineno _colno e]
  (go-post-feedback! (str "uncaught exception: " (utils/extract-first-line (utils/format-error e))))
  false)

(defn register-global-exception-handler! []
  (gset! "onerror" handle-scenario-exception!))

; -- notification handler ---------------------------------------------------------------------------------------------------

(defn handle-notification! [notification]
  (let [trigger-name (:trigger notification)
        args (:args notification)]
    (assert trigger-name)
    (call-trigger! trigger-name args)))

; -- facades ----------------------------------------------------------------------------------------------------------------

(defn go-ready! []
  (go
    (messages/init! "scenario")
    (feedback/subscribe-to-feedback!)                                                                                         ; this is needed for reply messages
    (notifications/init!)
    (register-global-exception-handler!)
    (notifications/subscribe-notifications! handle-notification!)
    (<! (messages/go-send-scenario-ready!))))

; -- capturing console output -----------------------------------------------------------------------------------------------

(defn go-handle-console-call [orig kind & args]
  (let [transcript (str kind args)]
    (.apply orig js/console (to-array args))
    (go-post-feedback! transcript (str "scenario out"))))

(defn store-console-api []
  {"log"   (gget "console.log")
   "warn"  (gget "console.warn")
   "info"  (gget "console.info")
   "error" (gget "console.error")})

(defn captured-console-api [original-api]
  {"log"   (partial go-handle-console-call (get original-api "log") "LOG: ")
   "warn"  (partial go-handle-console-call (get original-api "warn") "WARN: ")
   "info"  (partial go-handle-console-call (get original-api "info") "INFO: ")
   "error" (partial go-handle-console-call (get original-api "error") "ERROR: ")})

(defn set-console-api! [api]
  (gset! "console.log" (get api "log"))
  (gset! "console.warn" (get api "warn"))
  (gset! "console.info" (get api "info"))
  (gset! "console.error" (get api "error")))

(defn capture-console-as-feedback! []
  {:pre [(nil? @original-console-api)]}
  (reset! original-console-api (store-console-api))
  (set-console-api! (captured-console-api @original-console-api)))

(defn uncapture-console-as-feedback! []
  {:pre [(some? @original-console-api)]}
  (set-console-api! @original-console-api)
  (reset! original-console-api nil))
