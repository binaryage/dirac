#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DEVTOOLS_ROOT"

if [ -f "$CSS_PROPERTIES_SOURCE" ]; then
  cp "$CSS_PROPERTIES_SOURCE" "$CSS_PROPERTIES_COPY"
fi

python scripts/generate_supported_css.py "$CSS_PROPERTIES_COPY" "$CSS_PROPERTIES_OUTPUT_FILE"

popd