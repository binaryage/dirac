#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"
cd "$DEPOT_DIR"

TARGET_DIR="devtools-frontend"
SOURCE_DIR="dirac/resources/unpacked/devtools/"

echo "Syncing sources from '$SOURCE_DIR' to '$(portable_realpath "$TARGET_DIR")'..."
exec rsync -a --info=progress2 --delete "$SOURCE_DIR" "$TARGET_DIR"
