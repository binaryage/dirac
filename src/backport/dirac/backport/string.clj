(ns dirac.backport.string)

(defn includes?
  "True if s includes substr."
  {:added "1.8"}
  [^CharSequence s ^CharSequence substr]
  (.contains (.toString s) substr))
