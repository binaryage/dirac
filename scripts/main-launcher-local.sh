#!/usr/bin/env bash

# this a wrapper script for launching dirac.main from command line
#
# usage ./main-launcher.sh [args]
#

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

DEPS="{:deps {binaryage/dirac {:local/root \"$ROOT\"} clj-logging-config {:mvn/version \"1.9.12\"}}}"

JVM_OPTS=()
#JVM_OPTS+=("-J-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=127.0.0.1:5005")

set -x
clojure "${JVM_OPTS[@]}" -Sdeps "$DEPS" -m dirac.main "$@"
