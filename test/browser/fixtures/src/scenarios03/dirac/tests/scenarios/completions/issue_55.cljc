(ns dirac.tests.scenarios.completions.issue-55
  "https://github.com/binaryage/dirac/issues/55"
  (:require
    #?(:clj [dirac.settings :as ignored]
       :cljs [goog.object :as gobj])
    #?(:clj
            [dirac.project :refer :all])))                                                                                    ; there is no such thing as :refer :all in clojurescript

#?(:cljs
   (do
     (enable-console-print!)
     (def some-var "something")))
