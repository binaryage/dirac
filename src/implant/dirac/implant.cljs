(ns dirac.implant
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [cljs.analyzer.macros :refer [no-warn]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [cljs.tools.reader.reader-types :as tools-reader-types]
            [clojure.tools.namespace.parse :as ns-parse]
            [devtools.toolbox :refer [envelope]]
            [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [dirac.utils :refer-macros [runonce]]
            [dirac.dev]
            [dirac.implant.editor :as editor]
            [dirac.implant.intercom :as intercom]
            [dirac.implant.automation :as automation]
            [dirac.implant.version :refer [version]]
            [dirac.implant.eval :as eval]
            [dirac.implant.feedback :as feedback]
            [clojure.string :as string]
            [cljs.analyzer :as ana]))

(defonce ^:dynamic *console-initialized* false)
(defonce ^:dynamic *implant-initialized* false)

; -- public API -------------------------------------------------------------------------------------------------------------
; following functions will be exposed as helpers for devtools javascript code
; they should be called via dirac.something object, see the mapping in dirac-api-to-export below

(defn post-feedback! [& args]
  (apply feedback/post! args))

(defn init-console! []
  (when-not *console-initialized*
    (assert *implant-initialized*)
    (set! *console-initialized* true)
    (intercom/init!)
    (feedback/post! "console initialized")))

(defn init-repl! []
  (assert *implant-initialized*)
  (assert *console-initialized*)
  (intercom/init-repl!)
  (feedback/post! "repl initialized"))

(defn adopt-prompt! [text-area-element use-parinfer?]
  (feedback/post! (str "adopt-prompt-element" " use-parinfer? " use-parinfer?))
  (let [editor (editor/create-editor! text-area-element :prompt use-parinfer?)]
    (editor/start-editor-sync!)
    editor))

(defn send-eval-request! [request-id code scope-info]
  (feedback/post! (str "send-eval-request: " code))
  (intercom/send-eval-request! request-id code scope-info))

(defn get-version []
  version)

(defn get-runtime-tag [callback]
  (go
    (let [tag (<! (eval/get-runtime-tag))]
      (callback tag))))

(defn ns-to-relpath [ns ext]
  (str (string/replace (munge ns) \. \/) "." (name ext)))

(defn analyze-ns [ns-form opts]
  (let [env (ana/empty-env)]
    (no-warn (ana/analyze env ns-form nil opts))))

(defn parse-ns-form [source]
  (let [reader (tools-reader-types/string-push-back-reader source)]
    (ns-parse/read-ns-decl reader)))

(defn remove-identical-mappings [mapping]
  (into {} (remove (fn [[alias ns]] (= alias ns)) mapping)))

(defn get-aliases [mapping]
  (let [aliases (remove-identical-mappings mapping)]
    (if-not (empty? aliases)
      (clj->js aliases))))

(defn get-uses [mapping]
  (let [uses (remove-identical-mappings mapping)]
    (if-not (empty? uses)
      (clj->js uses))))

(defn parse-ns-from-source* [source]
  (when-let [ns-form (parse-ns-form source)]
    (let [ast (analyze-ns ns-form {})
          ns-descriptor #js {:name     (str (:name ast))
                             :aliases  (get-aliases (:requires ast))
                             :maliases (get-aliases (:require-macros ast))
                             :uses     (get-uses (:uses ast))
                             :muses    (get-uses (:use-macros ast))}]
      ;(log "parse-ns-from-source" ns-descriptor (envelope source) (envelope ast))
      ns-descriptor)))

(defn parse-ns-from-source [source]
  (try
    (parse-ns-from-source* source)
    (catch :default e
      (error "Unable to parse namespace from source" (envelope source) "\n" e))))

(defn is-cljs-function-name? [munged-name]
  (some? (re-matches #"^[^$]+\$[^$]+\$.*$" munged-name)))                                                                     ; must have at least two dollars but not at the beginning

(defn demunge-ns [munged-name]
  (string/replace munged-name "$" "."))

(defn break-and-demunge-name [munged-name]
  (let [index (.lastIndexOf munged-name "$")]
    (if (= index -1)
      ["" (demunge munged-name)]
      (let [ns (demunge (demunge-ns (.substring munged-name 0 index)))
            name (demunge (.substring munged-name (inc index) (.-length munged-name)))]
        [ns name]))))

(defn get-function-name [munged-name]
  (if (is-cljs-function-name? munged-name)
    (second (break-and-demunge-name munged-name))
    munged-name))

(defn get-full-function-name [munged-name]
  (if (is-cljs-function-name? munged-name)
    (string/join "/" (break-and-demunge-name munged-name))
    munged-name))

; -- dirac object augumentation ---------------------------------------------------------------------------------------------

; !!! don't forget to update externs.js when touching this !!!
(def dirac-api-to-export
  {"feedback"            post-feedback!
   "initConsole"         init-console!
   "initRepl"            init-repl!
   "adoptPrompt"         adopt-prompt!
   "sendEvalRequest"     send-eval-request!
   "getVersion"          get-version
   "getRuntimeTag"       get-runtime-tag
   "parseNsFromSource"   parse-ns-from-source
   "nsToRelpath"         ns-to-relpath
   "getFunctionName"     get-function-name
   "getFullFunctionName" get-full-function-name})

(defn enhance-dirac-object! [dirac]
  (doseq [[name fn] dirac-api-to-export]
    (oset dirac [name] fn)))

; -- init code --------------------------------------------------------------------------------------------------------------

(defn init-implant! []
  (when-not *implant-initialized*
    (set! *implant-initialized* true)
    (assert (not *console-initialized*))
    (enhance-dirac-object! (oget js/window "dirac"))                                                                          ; see front_end/dirac/dirac.js
    (automation/install!)
    (feedback/install!)
    (eval/start-eval-request-queue-processing-loop!)
    (feedback/post! "implant initialized")
    (info (str "Dirac implant v" (get-version) " initialized"))))

; -- intialization ----------------------------------------------------------------------------------------------------------

(runonce (init-implant!))