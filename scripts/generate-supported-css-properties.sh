#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

CSS_PROPERTIES_SOURCE="$CHROMIUM_MIRROR_DEVTOOLS_DIR/../core/css/CSSProperties.in"
CSS_PROPERTIES_COPY="$DEVTOOLS_ROOT/CSSProperties.in"
CSS_PROPERTIES_OUTPUT="$DEVTOOLS_ROOT/front_end/SupportedCSSProperties.js"

pushd "$DEVTOOLS_ROOT"

if [ -f "$CSS_PROPERTIES_SOURCE" ]; then
  cp "$CSS_PROPERTIES_SOURCE" "$CSS_PROPERTIES_COPY"
fi

python scripts/generate_supported_css.py "$CSS_PROPERTIES_COPY" "$CSS_PROPERTIES_OUTPUT"

popd