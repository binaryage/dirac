#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

WORK_DIR="$TMP_DIR/peon/generate-supported-css-properties"
mkdir -p "$WORK_DIR"

pushd "$CHROMIUM_MIRROR_DEVTOOLS_DIR"

REV=`git rev-parse HEAD`
TAG=`git tag -l "[0-9]*" | tail -1`

popd

pushd "$DEVTOOLS_ROOT"

if [ -f "$CSS_PROPERTIES_SOURCE" ]; then
  python scripts/build/generate_supported_css.py "$CSS_PROPERTIES_SOURCE" "$WORK_DIR/SupportedCSSProperties.js"

  pushd "$PEON_DIR"

  lein run -- gen-backend-css \
    --input="$WORK_DIR/SupportedCSSProperties.js" \
    --output="$CSS_PROPERTIES_OUTPUT_FILE" \
    --chrome-rev="$REV" \
    --chrome-tag="$TAG"

  popd

  echo "Generated fresh $CSS_PROPERTIES_OUTPUT_FILE"
else
  echo "Error: Properties source file not found in $CSS_PROPERTIES_SOURCE."
  exit 1
fi

popd
