#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

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

# fresh splitting..., it should do the job incrementally from last run
pushd "$CHROMIUM_MIRROR_DIR"

git fetch chromium

# this dance is here to avoid error "Branch '$branch' is not an ancestor of commit '<SHA>'"
# more info here: http://permalink.gmane.org/gmane.comp.version-control.git/239012
# instead of merging upstream changes, we rebase them onto our current tracker branch
# ...that should avoid git-subtree confusion
#
# if it fails, the workaround is to run full rescan:
#
#   ./scripts/fetch-devtools-branch.sh --ignore-joins
#
# git merge --commit --no-edit chromium/master
#
git checkout tracker
git rebase --onto tracker tracker chromium/master
git branch -d old-tracker || true # old-tracker branch may not exist during first run
git branch -m tracker old-tracker
git checkout -b tracker

# note: my-subtree is just my patched version of subtree command with github-friendly commit messages (SHAs are clickable)
git my-subtree split --rejoin --prefix="$DEVTOOLS_CHROMIUM_PREFIX" --branch "$DEVTOOLS_BRANCH" "$@"

git push dirac devtools

popd

popd