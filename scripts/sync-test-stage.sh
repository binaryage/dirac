#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TEST_STAGE=${1:-$DIRAC_TEST_STAGE_DIR}

cd "$ROOT"

mkdir -p "$TEST_STAGE"

RSYNC_VERSION=$(rsync --version | head -n 1 | cut -d " " -f 4)

set +e
vercomp "$RSYNC_VERSION" "3.1.1"
if [[ $? != 1 ]]; then
  echo "rsync version 3.1.2+ needed, your version $RSYNC_VERSION"
  echo "under mac use 'brew install homebrew/dupes/rsync' to get the latest rsync"
  exit 1
fi
set -e

echo "Syncing test stage from '$ROOT' to '$(portable_realpath "$TEST_STAGE")'..."
rsync -a --info=progress2 --delete --exclude-from="$DIRAC_TEST_STAGE_RSYNC_EXCLUDE_FILE" "$ROOT/" "$TEST_STAGE"
echo
