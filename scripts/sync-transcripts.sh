#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

"$SCRIPTS/sync-test-stage.sh"

pushd "$ROOT"

mkdir -p "$EXPECTED_TRANSCRIPTS_PATH"

rsync -av --delete "$DIRAC_TEST_STAGE_DIR/$ACTUAL_TRANSCRIPTS_PATH/" "$EXPECTED_TRANSCRIPTS_PATH/"

popd

popd
