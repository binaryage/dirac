#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$CHROMIUM_MIRROR_DIR"

rm -rf "$CHROMIUM_DEVTOOLS_DIR"
git checkout "$CHROMIUM_DEVTOOLS_PREFIX"
