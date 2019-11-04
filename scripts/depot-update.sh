#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"
cd "$DEPOT_DIR"

TARGET_DIR="dirac"

echo "Syncing sources from '$ROOT' to '$(portable_realpath "$TARGET_DIR")'..."
exec rsync -a --info=progress2 --delete --exclude-from="$DIRAC_TEST_STAGE_RSYNC_EXCLUDE_FILE" "$ROOT/" "$TARGET_DIR"
