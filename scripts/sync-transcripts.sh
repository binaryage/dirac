#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TEST_STAGE=${1:-$DIRAC_TEST_STAGE_DIR}

"$SCRIPTS/sync-test-stage.sh" "$TEST_STAGE"

cd "$ROOT"

mkdir -p "$EXPECTED_TRANSCRIPTS_PATH"

rsync -av --delete "$TEST_STAGE/$ACTUAL_TRANSCRIPTS_PATH/" "$EXPECTED_TRANSCRIPTS_PATH/"
