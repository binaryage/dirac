#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$CHROMIUM_MIRROR_DIR"

# prior first run, you want to setup out/Release build settings via `gn gen out/Release` or `gn args out/Release`
# see https://www.chromium.org/developers/how-tos/get-the-code
# see https://www.chromium.org/developers/testing/webkit-layout-tests

ninja -C out/Release blink_tests

popd

popd
