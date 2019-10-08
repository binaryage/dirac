#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TEST_STAGE=${1:-$DIRAC_TEST_STAGE_DIR}

cd "$ROOT"

rm -rf "$TEST_STAGE"
