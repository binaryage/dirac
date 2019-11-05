#!/usr/bin/env bash

if [[ -n "$SKIP_DIRAC_TESTS" ]]; then
  echo "skipping tests due to SKIP_DIRAC_TESTS"
  exit 0
fi

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

redirect_to_test_stage_if_needed

cd "$ROOT"

./scripts/test-backend.sh
./scripts/test-browser.sh "$@"
