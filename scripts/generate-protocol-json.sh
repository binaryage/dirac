#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$CHROMIUM_MIRROR_WEBKIT_SOURCE_DIR"

rm -rf _build

gn gen _build

ninja -C _build third_party/WebKit/Source/core/inspector:protocol_version

# TODO make sure protocol.json exists

popd
