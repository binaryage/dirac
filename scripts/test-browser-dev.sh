#!/usr/bin/env bash

# this will run browser tests against unpacked dirac extension

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

redirect_to_test_stage_if_needed

cd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_SETUP_CHROME_REMOTE_DEBUGGING_PORT=9444
export DIRAC_SETUP_NREPL_SERVER_PORT=13040
export DIRAC_AGENT__NREPL_SERVER__PORT=13040
export DIRAC_AGENT__NREPL_TUNNEL__PORT=13041
export DIRAC_RUNTIME__AGENT_PORT=13041
export DIRAC_NREPL__WEASEL_PORT=13042

lein compile-browser-tests
lein compile-marion
lein compile-dirac-dev
./scripts/run-browser-tests.sh "dirac.tests.browser.runner/-dev-main"
