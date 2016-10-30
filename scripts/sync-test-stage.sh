#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

mkdir -p "$DIRAC_TEST_STAGE_DIR"
rsync -a -v --delete --exclude-from="$DIRAC_TEST_STAGE_RSYNC_EXCLUDE_FILE" "$ROOT/" "$DIRAC_TEST_STAGE_DIR"

popd

popd
