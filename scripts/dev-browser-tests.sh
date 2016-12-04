#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

./scripts/clean-dev-browser-tests.sh
./scripts/clean-notify.sh

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_AGENT_PORT=9041

export DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9333
export DIRAC_SETUP_NREPL_SERVER_PORT=9040
export DIRAC_AGENT__NREPL_SERVER__PORT=9040
export DIRAC_AGENT__NREPL_TUNNEL__PORT=${DIRAC_AGENT_PORT}
export DIRAC_RUNTIME__AGENT_PORT=${DIRAC_AGENT_PORT}
export DIRAC_NREPL__WEASEL_PORT=9042
#export DIRAC_BROWSER_TESTS_LOG_LEVEL=DEBUG
export DIRAC_BROWSER_TESTS_LOG_LEVEL=TRACE

lein with-profile +cooper,+dev-browser-tests cooper

popd
