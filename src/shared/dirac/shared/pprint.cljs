(ns dirac.shared.pprint
  (:require [fipp.engine :as engine]
            [fipp.visit :as v]
            [fipp.edn :as edn]))

(defn abbreviate-long-string [string marker prefix-limit postfix-limit]
  (let [prefix (.slice string 0 prefix-limit)
        postfix (.slice string (- (.-length string) postfix-limit))]
    (str prefix marker postfix)))

(defn massage-string [s opts]
  (or
    (if-some [max-string-length (get opts :max-string-length)]
      (if (> (count s) max-string-length)
        (let [half-length (/ max-string-length 2)]
          (abbreviate-long-string s "..." half-length half-length))))
    s))

(defrecord DiracPrinter [fallback-printer opts]
  fipp.visit/IVisitor
  (visit-unknown [_this x] (v/visit-unknown fallback-printer x))
  (visit-nil [_this] (v/visit-nil fallback-printer))
  (visit-boolean [_this x] (v/visit-boolean fallback-printer x))
  (visit-string [_this x] (v/visit-string fallback-printer (massage-string x opts)))
  (visit-character [_this x] (v/visit-character fallback-printer x))
  (visit-symbol [_this x] (v/visit-symbol fallback-printer x))
  (visit-keyword [_this x] (v/visit-keyword fallback-printer x))
  (visit-number [_this x] (v/visit-number fallback-printer x))
  (visit-seq [_this x] (v/visit-seq fallback-printer x))
  (visit-vector [_this x] (v/visit-vector fallback-printer x))
  (visit-map [_this x] (v/visit-map fallback-printer x))
  (visit-set [_this x] (v/visit-set fallback-printer x))
  (visit-tagged [_this x] (v/visit-tagged fallback-printer x))
  (visit-meta [_this x-meta x] (v/visit-meta fallback-printer x-meta x))
  (visit-var [_this x] (v/visit-var fallback-printer x))
  (visit-pattern [_this x] (v/visit-pattern fallback-printer x))
  (visit-record [_this x] (v/visit-record fallback-printer x)))

(defn pprint
  ([x] (pprint x {}))
  ([x options]
   (let [defaults {:symbols              {}
                   :print-length         *print-length*
                   :print-level          *print-level*
                   :print-meta           *print-meta*
                   :print-namespace-maps *print-namespace-maps*
                   :pprint-document      engine/pprint-document}
         opts (merge defaults options)
         pprint-document (:pprint-document opts)
         fallback-printer (edn/map->EdnPrinter opts)
         printer (DiracPrinter. fallback-printer opts)]
     (pprint-document (v/visit printer x) opts))))
