#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_CHROME_REMOTE_DEBUGGING_PORT=9444
export DIRAC_NREPL_SERVER_PORT=13040
export DIRAC_AGENT_PORT=13041
export DIRAC_NREPL_WEASEL_PORT=13042

echo "Running all browser tests..."
lein with-profile +test-runner run -m "$@"

popd