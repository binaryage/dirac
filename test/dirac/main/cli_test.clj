(ns dirac.main.cli-test
  (:require [clojure.test :refer :all]
            [matcher-combinators.test :refer :all]
            [matcher-combinators.matchers :as m]
            [dirac.main.cli :as cli :refer [parse-cli-args]]))

(deftest parse-cli-args-test
  (testing "parsing CLI arguments"

    (testing "help usage"
      (are [args] (match? {:command     :exit
                           :exit-status 0
                           :message     #"Usage:"}
                          (parse-cli-args args))
                  ["help"]
                  ["--help"]
                  ["-h"]))

    (testing "no action, should default to :launch"
      (is (match? {:command (keyword cli/default-command)}
                  (parse-cli-args []))))

    (testing "unsupported action"
      (is (match? {:command     :exit
                   :exit-status 1
                   :message     #"Unknown command: \"unknown-action\""}
                  (parse-cli-args ["unknown-action"]))))

    (testing "too many actions"
      (is (match? {:command     :exit
                   :exit-status 1
                   :message     #"Unknown command: \"action1\""}
                  (parse-cli-args ["action1" "action2"]))))

    (testing "launch command"
      (are [args] (match? {:command   :launch
                           :log-level "INFO"}
                          (parse-cli-args args))
                  ["launch"]))

    (testing "verbosity"
      (is (match? {:log-level "INFO"} (parse-cli-args [])))
      (is (match? {:log-level "DEBUG"} (parse-cli-args ["-v"])))
      (is (match? {:log-level "TRACE"} (parse-cli-args ["-vv"])))
      (is (match? {:log-level "ALL"} (parse-cli-args ["-vvv"])))
      (is (match? {:log-level "ALL"} (parse-cli-args ["-vvvvvv"]))))

    ; ---
    ))

(comment
  (run-tests))
