(ns dirac.nrepl.protocol)

(defn status-message? [message]
  (some? (:status message)))

(defn prepare-print-output-response [kind content]
  {:pre [(contains? #{:stderr :stdout :java-trace} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})
