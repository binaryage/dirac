#!/usr/bin/env bash

if [[ -n "$SKIP_DIRAC_TESTS" ]]; then
  echo "skipping tests due to SKIP_DIRAC_TESTS"
  exit 0
fi

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

redirect_to_test_stage_if_needed

export LEIN_FAST_TRAMPOLINE=  # lein trampoline caches might get confused in test stage

cd "$ROOT"

./scripts/test-backend.sh
./scripts/test-browser.sh "$@"
