(ns dirac.home.locations-test
  (:require [clojure.test :refer :all])
  (:require [dirac.home.helpers :as helpers]
            [dirac.home.locations :refer [resolve-home-dir]]))

(defn make-mock-system-get-property [user-home-dir]
  (fn [name]
    (case name
      "user.home" user-home-dir)))

(defn make-mock-system-get-env-empty []
  (fn [_name]))

(defn make-mock-system-get-env-dirac-home [dirac-home-dir]
  (fn [name]
    (case name
      "DIRAC_HOME" dirac-home-dir)))

; note: this tests will probably fail under windows
(deftest resolve-home-dir-test
  (binding [helpers/*system-get-property-impl* (make-mock-system-get-property "/some/home")
            helpers/*system-get-env-impl* (make-mock-system-get-env-empty)]
    (is (= (resolve-home-dir) "/some/home/.dirac")))
  (binding [helpers/*system-get-property-impl* (make-mock-system-get-property "/some/home")
            helpers/*system-get-env-impl* (make-mock-system-get-env-dirac-home "/explicit/dirac/home")]
    (is (= (resolve-home-dir) "/explicit/dirac/home"))))

(comment
  (run-tests))
