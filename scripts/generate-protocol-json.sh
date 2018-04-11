#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$CHROMIUM_BLINK_RENDERER_DIR"

rm -rf _build

gn gen _build

ninja -C _build third_party/blink/renderer/core/inspector:protocol_version

# TODO make sure protocol.json exists

popd
