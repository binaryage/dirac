#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_CHROME_REMOTE_DEBUGGING_PORT=9444
export DIRAC_NREPL_SERVER_PORT=12040
export DIRAC_AGENT_PORT=12041
export DIRAC_NREPL_WEASEL_PORT=12042

echo "Running backend tests..."
lein run-backend-tests-17
lein run-backend-tests-18
lein run-backend-tests-19

popd

popd
