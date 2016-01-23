#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$CHROMIUM_MIRROR_DIR"

git checkout master
git pull

popd

pushd "$DEVTOOLS_ROOT"

if [ -f "$CSS_PROPERTIES_SOURCE" ]; then
  python scripts/generate_supported_css.py "$CSS_PROPERTIES_SOURCE" "$CSS_PROPERTIES_OUTPUT_FILE"
  echo "Generated fresh $CSS_PROPERTIES_OUTPUT_FILE"
else
  echo "Error: Properties source file not found in $CSS_PROPERTIES_SOURCE."
  exit 1
fi

popd