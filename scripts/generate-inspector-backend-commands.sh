#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

WORK_DIR="$TMP_DIR/peon/generate-inspector-backend-commands"
mkdir -p "$WORK_DIR"

cd "$CHROMIUM_DEVTOOLS_DIR"

REV=$(git rev-parse HEAD)
TAG=$(git tag -l "[0-9]*" | tail -1)

cd "$DEVTOOLS_ROOT"

python scripts/build/code_generator_frontend.py "$PROTOCOL_JSON_FILE" --output_js_dir "$WORK_DIR"

cd "$PEON_DIR"

lein run -- gen-backend-api \
  --input="$WORK_DIR/InspectorBackendCommands.js" \
  --output="$DEVTOOLS_ROOT/front_end/InspectorBackendCommands.js" \
  --chrome-rev="$REV" \
  --chrome-tag="$TAG"
