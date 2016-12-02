#!/usr/bin/env bash

# this will run browser tests against fully optimized dirac extension (release build)

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
SETUP="\
DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9444 \
DIRAC_SETUP_NREPL_SERVER_PORT=12040 \
DIRAC_AGENT/NREPL_SERVER/PORT=12040 \
DIRAC_AGENT/NREPL_TUNNEL/PORT=12041 \
DIRAC_RUNTIME/AGENT_PORT=12041 \
DIRAC_NREPL/WEASEL_PORT=12042"

env ${SETUP} ./scripts/run-backend-tests.sh

popd

popd
