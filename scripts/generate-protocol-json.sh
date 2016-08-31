#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$CHROMIUM_MIRROR_WEBKIT_SOURCE_DIR"

rm -rf _build

gn gen _build

ninja -C _build third_party/WebKit/Source/core/inspector:protocol_version

# TODO make sure protocol.json exists

popd

popd
