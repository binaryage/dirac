#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$CHROMIUM_MIRROR_DIR"

rm -rf "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
git checkout "$DEVTOOLS_CHROMIUM_PREFIX"

popd

popd
