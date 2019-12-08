#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

set -x

cd "$DEVTOOLS_SCRIPTS"

yarn test --chromium-path="$CHROMIUM_MIRROR_DIR"
