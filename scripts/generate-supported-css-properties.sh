#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

WORK_DIR="$TMP_DIR/peon/generate-supported-css-properties"
mkdir -p "$WORK_DIR"

cd "$CHROMIUM_DEVTOOLS_DIR"

REV=$(git rev-parse HEAD)
TAG=$(git tag -l "[0-9]*" | tail -1)

cd "$DEVTOOLS_ROOT"

if [[ -f "$CSS_PROPERTIES_SOURCE" ]]; then
  python scripts/build/generate_supported_css.py "$CSS_PROPERTIES_SOURCE" "$WORK_DIR/SupportedCSSProperties.js"

  cd "$PEON_DIR"

  lein run -- gen-backend-css \
    --input="$WORK_DIR/SupportedCSSProperties.js" \
    --output="$CSS_PROPERTIES_OUTPUT_FILE" \
    --chrome-rev="$REV" \
    --chrome-tag="$TAG"

  echo "Generated fresh $CSS_PROPERTIES_OUTPUT_FILE"
else
  echo "Error: Properties source file not found in $CSS_PROPERTIES_SOURCE."
  exit 1
fi
