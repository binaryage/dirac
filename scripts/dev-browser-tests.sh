#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

./scripts/clear-notify.sh

export DIRAC_CHROME_REMOTE_DEBUGGING_PORT=9333

./scripts/clean-compiled.sh
lein with-profile +cooper,+dev-browser-tests cooper

popd