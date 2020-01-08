#!/usr/bin/env bash

# this a wrapper script for launching dirac.main from command line
#
# usage ./main-launcher.sh [args]
#

set -e -o pipefail

DEPS='{:deps {binaryage/dirac {:mvn/version "1.5.0"} clj-logging-config {:mvn/version "1.9.12"}}}'

#set -x
exec clojure -Sdeps "$DEPS" -m dirac.main "$@"
