#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

export DIRAC_TEST_PLAYGROUND="$ROOT/test/playground"

echo "Running CLI tests..."
lein run-cli-tests-110
lein run-cli-tests-19
