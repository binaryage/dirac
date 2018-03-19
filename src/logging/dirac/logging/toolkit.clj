(ns dirac.logging.toolkit
  "Support for logging into js console"
  (:require [cljs.env]))

(defn get-compiler-optimizations-mode []
  (or (if cljs.env/*compiler*
        (get-in @cljs.env/*compiler* [:options :optimizations]))
      :none))

(defn compiler-in-dev-mode? []
  (= (get-compiler-optimizations-mode) :none))

(defn get-prefix-style [opts]
  (let [fg-color (get opts :fg-color "white")
        bg-color (get opts :bg-color "blue")]
    (str "background-color:" bg-color ";"
         "color:" fg-color ";"
         "font-weight:bold;"
         "padding:0px 3px;"
         "border-radius:2px;")))

(defn gen-dev-console-log [method args opts]
  (let [api (str "console." method)
        prefix (get opts :prefix "?")
        prefix-formatting ["%c%s" (get-prefix-style opts) prefix]]
    `(oops.core/gcall!+ ~api ~@prefix-formatting ~@args)))

(defn gen-rel-console-log [method args opts]
  (let [prefix (get opts :prefix "?")
        wrapped-args (map (fn [arg] `(dirac.utils/pprint-str ~arg)) args)
        separated-args (interpose "↦" wrapped-args)
        msg `(str "[" ~prefix "] " ~@separated-args)
        api (str "console." method)]
    `(oops.core/gcall!+ ~api ~msg)))

(defn gen-console-log [method args opts]
  `(do
     ~(if (compiler-in-dev-mode?)
        (gen-dev-console-log method args opts)
        (gen-rel-console-log method args opts))
     nil))
