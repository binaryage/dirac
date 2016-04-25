#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

./scripts/clear-notify.sh

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_CHROME_REMOTE_DEBUGGING_PORT=9333
export DIRAC_NREPL_SERVER_PORT=8040
export DIRAC_AGENT_PORT=8041

./scripts/clean-compiled.sh
lein with-profile +cooper,+dev-browser-tests cooper

popd