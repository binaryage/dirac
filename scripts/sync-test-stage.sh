#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

TEST_STAGE=${1:-$DIRAC_TEST_STAGE_DIR}

pushd "$ROOT"

mkdir -p "$TEST_STAGE"

RSYNC_VERSION=`rsync --version | head -n 1 | cut -d " " -f 4`

set +e
vercomp "$RSYNC_VERSION" "3.1.1"
if [[ $? != 1 ]]; then
  echo "rsync version 3.1.2+ needed, your version $RSYNC_VERSION"
  echo "under mac use 'brew install homebrew/dupes/rsync' to get the latest rsync"
  exit 1
fi

set -e

echo "Syncing test stage from '$ROOT' to '$(portable_realpath "$TEST_STAGE")'..."
rsync -a --delete --exclude-from="$DIRAC_TEST_STAGE_RSYNC_EXCLUDE_FILE" "$ROOT/" "$TEST_STAGE"
echo

popd
