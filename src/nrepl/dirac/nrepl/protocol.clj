(ns dirac.nrepl.protocol)

(defn make-server-side-output-msg [kind content]
  {:pre [(contains? #{:stderr :stdout :java-trace} kind)
         (string? content)]}
  {:op      :print-output
   :kind    kind
   :content content})
