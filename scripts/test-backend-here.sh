#!/usr/bin/env bash

# this will run browser tests against fully optimized dirac extension (release build)

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9444
export DIRAC_SETUP_NREPL_SERVER_PORT=12040
export DIRAC_AGENT__NREPL_SERVER__PORT=12040
export DIRAC_AGENT__NREPL_TUNNEL__PORT=12041
export DIRAC_RUNTIME__AGENT_PORT=12041
export DIRAC_NREPL__WEASEL_PORT=12042

./scripts/run-backend-tests.sh

popd

popd
