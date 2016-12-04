#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

set -x

pushd "$ROOT"

# chromium-mirror should have 3 branches
#
# 1) master - tracking official chromium master as chromium/master
# 2) tracker - branch where we run splitting + rejoins
# 3) devtools - distilled branch containing only devtools commits
#
# chromium-mirror should have following remotes:
# 1) chromium - official chromium repo
# 2) dirac - repo where to push distilled devtools branch
#
# read more docs on subtree: https://github.com/apenwarr/git-subtree/blob/master/git-subtree.txt

if [ ! -d "$CHROMIUM_MIRROR_DIR" ] ; then
  echo "'$CHROMIUM_MIRROR_DIR' does not exist, you have to setup chromium mirror first"
  popd
  exit 1
fi

popd

# fresh splitting..., it should do the job incrementally from last run
pushd "$CHROMIUM_MIRROR_DIR"

git fetch chromium
git checkout tracker
git reset --hard chromium/master
git clean -fd
gclient sync
git filter-branch -f --prune-empty --subdirectory-filter third_party/WebKit/Source/devtools tracker

git checkout devtools
git reset --hard tracker
git push dirac devtools

popd
