#!/usr/bin/env bash

# this will run browser tests against fully optimized dirac extension (release build)

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

redirect_to_test_stage_if_needed

cd "$ROOT"

./scripts/run-cli-tests.sh
