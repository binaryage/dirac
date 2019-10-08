#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

rm -rf "$CHROMIUM_DEVTOOLS_DIR"
ln -s "$DEVTOOLS_ROOT" "$CHROMIUM_DEVTOOLS_DIR"
touch "$CHROMIUM_DEVTOOLS_DIR"
