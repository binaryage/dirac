#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/clean-dev-browser-tests.sh
./scripts/clean-notify.sh

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_SETUP_WEASEL_VERBOSE=true
export DIRAC_SETUP_AGENT_VERBOSE=true

lein with-profile +cooper,+dev-dirac-sample cooper

popd

popd
