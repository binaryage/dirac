#!/usr/bin/env bash

# running in $ROOT, see bisect-compiler-helper.sh

set -e

COMPILER_VERSION=$1

# here implement actual testing of dirac against pre-compiled clojurescript version

export CANARY_CLOJURESCRIPT_VERSION=${COMPILER_VERSION}
export DIRAC_SETUP_BROWSER_TEST_FILTER="issue-53"

./scripts/clean-test-stage.sh
set +e
lein test-browser
STATUS=$?
set -e

# lein test-browser returns 255 (-1) on failure
# git bisect run expects status codes between 1 - 127, 125 is special, 128+ is abort
# convert status to 0/1
if [[ "$STATUS" -ne "0" ]]; then
  STATUS=1 # failed
else
  STATUS=0 # passed
fi

exit ${STATUS}