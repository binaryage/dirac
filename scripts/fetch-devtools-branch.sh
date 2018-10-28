#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

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

# chrome devs renamed Webkit subfolder to blink in commit 0aee4434a4dba42a42abaea9bfbc0cd196a63bc1
# see commit SPLIT_SHA crbug.com/768828
# third_party/WebKit/Source/devtools -> third_party/blink/renderer/devtools

SPLIT_SHA="0aee4434a4dba42a42abaea9bfbc0cd196a63bc1" # The Great Blink mv for source files, part 2.
PRE_SPLIT_SHA="$SPLIT_SHA^"
LATEST_SHA="chromium/master"

git fetch chromium
git checkout -f -B work "$LATEST_SHA"
git clean -ffd
git log -1 HEAD
git status
gclient sync --with_branch_heads --reset --delete_unversioned_trees
git fetch --tags

if ! git rev-parse --verify tracker1; then
  echo "tracker1 branch does not exist => filter it"
  git branch -f tracker1 "$PRE_SPLIT_SHA"
  git filter-branch -f --state-branch refs/heads/tracker1-state --prune-empty --subdirectory-filter third_party/WebKit/Source/devtools tracker1
else
  echo "tracker1 branch exists => using it as-is"
  git log -1 tracker1
fi

git branch -f tracker2 "$LATEST_SHA"
git filter-branch -f --state-branch refs/heads/tracker2-state --prune-empty --subdirectory-filter third_party/blink/renderer/devtools tracker2

# this will effectively replay all commits from tracker2 on top of last commit in tracker1 and puts the result into devtools branch
# note that my first attempt was to use git rebase, but that would rewrite committer metadata

git branch -f tracker3 tracker2
git filter-branch -f --state-branch refs/heads/tracker3-state --parent-filter '
    read parents
    if [ "$parents" = "" ]; then
        echo "-p tracker1"
    else
        echo "$parents"
    fi' tracker3

git branch -f devtools tracker3

git push dirac devtools

popd
