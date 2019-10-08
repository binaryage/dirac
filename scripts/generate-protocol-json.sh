#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$CHROMIUM_BLINK_RENDERER_DIR"

rm -rf _build

gn gen _build

ninja -C _build third_party/blink/renderer/core/inspector:protocol_version

# TODO make sure protocol.json exists
