(ns dirac.logging.toolkit
  "Common code for logging into js console"
  (:require [clojure.string :as string]
            [dirac.shared.utils :refer [advanced-mode?]]))

(defn get-prefix-style [opts]
  (let [fg-color (get opts :fg-color "white")
        bg-color (get opts :bg-color "blue")]
    (str "background-color:" bg-color ";"
         "color:" fg-color ";"
         "font-weight:bold;"
         "padding:0px 3px;"
         "border-radius:2px;")))

(defn massage-ns-name [ns-name]
  (-> ns-name
      (string/replace-first #"^dirac\." "D:")
      (string/replace-first #"^marion\." "M:")))

(defn compute-prefix [opts]
  (if-some [env (get opts :env)]
    (let [ns-name (name (:name (:ns env)))
          prefix (massage-ns-name ns-name)
          line (get env :line)
          line-postfix (if (some? line) (str ":" line) "")]
      (str prefix line-postfix))
    "?"))

(defn get-or-compute-prefix [opts]
  (if-some [prefix (get opts :prefix)]
    prefix
    (compute-prefix opts)))

(defn gen-dev-console-log [method args opts]
  (let [api (str "console." method)
        prefix (get-or-compute-prefix opts)
        prefix-formatting ["%c%s" (get-prefix-style opts) prefix]]
    `(oops.core/gcall!+ ~api ~@prefix-formatting ~@args)))

(defn gen-raw-console-log [method args opts]
  (let [api (str "console." method)
        prefix (get-or-compute-prefix opts)
        printed-args (map (fn [arg] `(dirac.shared.utils/pprint-str ~arg 3 10 200)) args)
        msg `(str "[" ~prefix "] " ~@printed-args "---")]
    `(oops.core/gcall!+ ~api ~msg)))

(defn gen-console-log [method args opts]
  `(do
     ~(if (or (true? (:raw opts)) (advanced-mode?))
        (gen-raw-console-log method args opts)
        (gen-dev-console-log method args opts))
     nil))
