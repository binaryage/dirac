(ns dirac.runtime.util)

(defmacro display-banner [installed-features known-features fmt & params]
  `(when-not (dirac.runtime.prefs/pref :dont-display-banner)
     (let [[fmt-str# params#] (feature-list-display ~installed-features ~known-features)]
       (.apply (.-info js/console) js/console (into-array (concat [(str ~fmt " " fmt-str#) ~@params] params#))))))