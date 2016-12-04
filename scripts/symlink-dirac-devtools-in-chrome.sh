#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

rm -rf "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
ln -s "$DEVTOOLS_ROOT" "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
touch "$CHROMIUM_MIRROR_DEVTOOLS_DIR"
