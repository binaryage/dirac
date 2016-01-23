#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

MESSAGE=$(git log -1 HEAD --pretty=format:%s)

if [[ ! "$MESSAGE" == *"merge updates from official devtools"* ]]; then
  echo "run ./scripts/squash-and-merge-official-updates.sh before diffing"
  echo "unmerged changes would appear in the diff"
  exit 1
fi

if [ -d "$DIFF_WORK_DIR" ] ; then
  rm -rf "$DIFF_WORK_DIR"
fi

git clone "$ROOT" "$DIFF_WORK_DIR" --branch "$DEVTOOLS_BRANCH"

pushd "$DIFF_WORK_DIR"

cp -r "$DEVTOOLS_ROOT"/* .

gitup

popd