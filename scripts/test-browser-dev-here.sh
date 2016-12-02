#!/usr/bin/env bash

# this will run browser tests against unpacked dirac extension

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
SETUP="\
DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9444 \
DIRAC_SETUP_NREPL_SERVER_PORT=13040 \
DIRAC_AGENT/NREPL_SERVER/PORT=13040 \
DIRAC_AGENT/NREPL_TUNNEL/PORT=13041 \
DIRAC_RUNTIME/AGENT_PORT=13041 \
DIRAC_NREPL/WEASEL_PORT=13042"

env ${SETUP} lein compile-browser-tests
env ${SETUP} lein compile-marion
env ${SETUP} lein compile-dirac-dev
env ${SETUP} ./scripts/run-browser-tests.sh "dirac.tests.browser.runner/-dev-main"

popd

popd
