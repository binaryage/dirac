#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$CHROMIUM_MIRROR_DIR"

rm -rf "$CHROMIUM_DEVTOOLS_DIR"
git checkout "$CHROMIUM_DEVTOOLS_PREFIX"

popd
