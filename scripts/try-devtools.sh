#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

die_if_dirty_working_copy () {
  if [ -n "$(git status -uno --porcelain)" ] ; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

pushd "$ROOT"

die_if_dirty_working_copy

rm -rf "$DEVTOOLS_ROOT"
cp -R "$DEVTOOLS_WORKTREE" "$DEVTOOLS_ROOT"

popd
