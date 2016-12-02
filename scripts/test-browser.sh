#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

"$SCRIPTS/sync-test-stage.sh"

pushd "$DIRAC_TEST_STAGE_DIR"

./scripts/test-browser-here.sh

popd

popd
