(ns dirac.tests.scenarios.exception.core)

(enable-console-print!)

(defn crash! []
  (into nil :invalid))

(defprotocol ITestProtocol
  "Protocol for creating an empty collection."
  (-pmethod
    [this p1]
    [this p1 p2]
    [this p1 p2 rest]))

(deftype TestType [prop1]
  ITestProtocol
  (-pmethod [this p1])
  (-pmethod [this p1 p2]
    (-pmethod this p1 p2 "more"))
  (-pmethod [this p1 p2 rest]
    (crash!)))

(defn excercise-protocol! []
  (let [instance (TestType. :prop-value)]
    (-pmethod instance "x" "y")))

(defn multi-arity-fn
  ([] (multi-arity-fn 1 2))
  ([p1 p2] (multi-arity-fn 3 4 5 6))
  ([p1 p2 p3 & rest] (excercise-protocol!)))

(defn fancy-$%$#%$#-function???-name [param]
  (multi-arity-fn))

(defn exception-demo! []
  (fancy-$%$#%$#-function???-name :some-arg))

(defn ^:export exception-demo-handler []
  (println "causing exception")
  (exception-demo!))
