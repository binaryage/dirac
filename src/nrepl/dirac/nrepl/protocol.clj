(ns dirac.nrepl.protocol)

(defn status-message? [message]
  (some? (:status message)))

(defn prepare-print-output-response [kind content]
  {:pre [(contains? #{:stderr :stdout :java-trace} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})

(defn prepare-current-env-info-response [ns compiler-id]
  {:ns          ns
   :compiler-id (or compiler-id "")})

(defn prepare-printed-value-response [value]
  (assert (or (nil? value) (string? value)))
  {:value         (or value "nil")
   :printed-value 1})
