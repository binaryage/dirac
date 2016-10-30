#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/clean-dev-browser-tests.sh
./scripts/clean-notify.sh

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_AGENT_PORT=9041

SETUP="\
DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9333 \
DIRAC_SETUP_NREPL_SERVER_PORT=9040 \
DIRAC_AGENT/NREPL_SERVER/PORT=9040 \
DIRAC_AGENT/NREPL_TUNNEL/PORT=$DIRAC_AGENT_PORT \
DIRAC_RUNTIME/AGENT_PORT=$DIRAC_AGENT_PORT \
DIRAC_NREPL/WEASEL_PORT=9042"

env ${SETUP} lein with-profile +cooper,+dev-browser-tests cooper

popd

popd
