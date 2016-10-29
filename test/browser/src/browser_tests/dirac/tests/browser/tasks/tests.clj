(ns dirac.tests.browser.tasks.tests
  (:require [clojure.test :refer :all]
            [clojure.tools.logging :as log]
            [clj-webdriver.taxi :as taxi]
            [dirac.settings :refer [get-fixtures-server-url]]
            [dirac.tests.browser.tasks.macros :refer [with-transcript-suite]]
            [dirac.tests.browser.tasks.transcript :refer [execute-transcript-test!]]))

; note: we expect current working directory to be dirac root directory ($root)
; $root/test/browser/transcripts/expected/*.txt should contain expected transcripts
; see settings.clj for actual constants

; -- individual tests -------------------------------------------------------------------------------------------------------

(defn fixtures-web-server-check []
  (taxi/to (get-fixtures-server-url))
  (is (= (taxi/text "body") "fixtures web-server ready")))

; to run only selected tests run something like this (fish shell):
; > env DIRAC_BROWSER_TEST_FILTER="error-feedback welcome" lein test-browser
(deftest test-all
  (fixtures-web-server-check)
  (with-transcript-suite "suite01"
    (execute-transcript-test! "barebone")
    (execute-transcript-test! "preloads")
    (execute-transcript-test! "runtime-api")
    (execute-transcript-test! "no-agent")
    (execute-transcript-test! "version-checks")
    (execute-transcript-test! "console")
    (execute-transcript-test! "repl")
    (execute-transcript-test! "completions")
    (execute-transcript-test! "options")
    (execute-transcript-test! "error-feedback")
    (execute-transcript-test! "misc"))
  (with-transcript-suite "suite02"
    (execute-transcript-test! "welcome-message")
    (execute-transcript-test! "enable-parinfer")
    (execute-transcript-test! "clean-urls")
    (execute-transcript-test! "beautify-function-names")))
