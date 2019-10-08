#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$CHROMIUM_MIRROR_DIR"

# prior first run, you want to setup out/Release build settings via `gn gen out/Release` or `gn args out/Release`
# see https://www.chromium.org/developers/how-tos/get-the-code
# see https://www.chromium.org/developers/testing/webkit-layout-tests

ninja -C out/Release blink_tests
