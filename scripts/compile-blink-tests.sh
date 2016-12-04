#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$CHROMIUM_MIRROR_DIR"

# prior first run, you want to setup out/Release build settings via `gn gen out/Release` or `gn args out/Release`
# see https://www.chromium.org/developers/how-tos/get-the-code
# see https://www.chromium.org/developers/testing/webkit-layout-tests

ninja -C out/Release blink_tests

popd
