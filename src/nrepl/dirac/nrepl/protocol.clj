(ns dirac.nrepl.protocol)

(defn status-message? [message]
  (some? (:status message)))

(defn prepare-print-output-response [kind content]
  {:pre [(contains? #{:stderr :stdout :java-trace} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})

(defn prepare-current-env-info-response [current-ns selected-compiler-id default-compiler-id]
  (assert (string? current-ns))
  (assert (or (nil? selected-compiler-id) (string? selected-compiler-id)))
  (assert (or (nil? default-compiler-id) (string? default-compiler-id)))
  {:ns                   current-ns
   :selected-compiler-id selected-compiler-id
   :default-compiler-id  default-compiler-id})

(defn prepare-printed-value-response [value]
  (assert (or (nil? value) (string? value)))
  {:value         (or value "nil")
   :printed-value 1})

(defn prepare-done-response []
  {:status :done})

(defn prepare-related-response [template-message response]
  (merge (select-keys template-message [:id :session]) response))

(defn prepare-bootstrap-error-response [details]
  {:status  :bootstrap-error
   :details details})

(defn prepare-out-response [out]
  {:out out})

(defn prepare-err-response [err]
  {:err err})

(defn prepare-handle-forwarded-nrepl-message-response [id session job-id serialized-forwardable-message]
  {:op                                 :handle-forwarded-nrepl-message
   :id                                 id
   :session                            session
   :job-id                             job-id
   :serialized-forwarded-nrepl-message serialized-forwardable-message})

(defn prepare-version-response [version]
  {:version version})

(defn extract-bare-status-response [nrepl-message]
  (select-keys nrepl-message [:status :err :out]))
