#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

TEST_STAGE=${1:-$DIRAC_TEST_STAGE_DIR}

"$SCRIPTS/sync-test-stage.sh" "$TEST_STAGE"

pushd "$ROOT"

mkdir -p "$EXPECTED_TRANSCRIPTS_PATH"

rsync -av --delete "$TEST_STAGE/$ACTUAL_TRANSCRIPTS_PATH/" "$EXPECTED_TRANSCRIPTS_PATH/"

popd
