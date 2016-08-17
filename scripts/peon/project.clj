(defproject binaryage/dirac-peon "0.1.0-SNAPSHOT"
  :description "a helper tool for dirac"
  :url "https://github.com/binaryage/dirac"
  :license {:name         "MIT License"
            :url          "http://opensource.org/licenses/MIT"
            :distribution :repo}
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [org.clojure/tools.cli "0.3.5"]
                 [funcool/cuerdas "0.6.0"]]
  :source-paths ["src"]
  :main peon.core)
