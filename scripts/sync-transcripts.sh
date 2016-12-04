#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

"$SCRIPTS/sync-test-stage.sh"

pushd "$ROOT"

mkdir -p "$EXPECTED_TRANSCRIPTS_PATH"

rsync -av --delete "$DIRAC_TEST_STAGE_DIR/$ACTUAL_TRANSCRIPTS_PATH/" "$EXPECTED_TRANSCRIPTS_PATH/"

popd
