#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

WORK_DIR="$TMP_DIR/peon/generate-inspector-backend-commands"
mkdir -p "$WORK_DIR"

pushd "$CHROMIUM_MIRROR_DEVTOOLS_DIR"

REV=`git rev-parse HEAD`
TAG=`git tag -l "[0-9]*" | tail -1`

popd

pushd "$DEVTOOLS_ROOT"

python scripts/build/code_generator_frontend.py "$PROTOCOL_JSON_FILE" --output_js_dir "$WORK_DIR"

popd

pushd "$PEON_DIR"

lein run -- gen-backend-api \
  --input="$WORK_DIR/InspectorBackendCommands.js" \
  --output="$DEVTOOLS_ROOT/front_end/InspectorBackendCommands.js" \
  --chrome-rev="$REV" \
  --chrome-tag="$TAG"

popd
