#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

die_if_dirty_working_copy () {
  if [[ -n "$(git status -uno --porcelain)" ]]; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

cd "$ROOT"

die_if_dirty_working_copy

rm -rf "$DEVTOOLS_ROOT"
cp -R "$DEVTOOLS_WORKTREE" "$DEVTOOLS_ROOT"
