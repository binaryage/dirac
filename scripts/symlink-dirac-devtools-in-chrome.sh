#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

rm -rf "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
ln -s "$DEVTOOLS_ROOT" "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
touch "$CHROMIUM_MIRROR_DEVTOOLS_DIR"

popd
