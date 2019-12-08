#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

set -x

cd "$ROOT"

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

if [[ ! -d "$CHROMIUM_MIRROR_DIR" ]]; then
  echo "'$CHROMIUM_MIRROR_DIR' does not exist, you have to setup chromium mirror first"
  exit 1
fi

# fresh splitting..., it should do the job incrementally from last run
# beware! major git lobotomy incoming
cd "$CHROMIUM_MIRROR_DIR"

python --version

# chrome devs renamed Webkit subfolder to blink in commit 0aee4434a4dba42a42abaea9bfbc0cd196a63bc1
# see commit SPLIT_SHA crbug.com/768828
# split1: third_party/WebKit/Source/devtools -> third_party/blink/renderer/devtools
# there was another major split:
# split2: third_party/blink/renderer/devtools -> [a new repo] https://chromium.googlesource.com/devtools/devtools-frontend

SPLIT_SHA="0aee4434a4dba42a42abaea9bfbc0cd196a63bc1" # The Great Blink mv for source files, part 2.
SPLIT2_SHA="923cd866fb089619bbbd971ff16cd7d766c1fb67"
SPLIT_SHA_PARENT=$(git rev-parse "$SPLIT_SHA^")
SPLIT2_SHA_PARENT=$(git rev-parse "$SPLIT2_SHA^") # DevTools: Update localization error message to warn about placeholder <ex>
LATEST_SHA="chromium/master"

git fetch chromium
git checkout -f -B work "$LATEST_SHA"
git clean -ffd
git log -1 HEAD
git status
gclient sync --with_branch_heads --reset --delete_unversioned_trees
git fetch --tags

CHROME_REV=$(git rev-parse HEAD)
CHROME_TAG=$(git tag -l "[0-9]*" | tail -1)

if ! git rev-parse --verify tracker1; then
  echo "tracker1 branch does not exist => filter it"
  git branch -f tracker1 "$SPLIT_SHA_PARENT"
  git filter-branch -f --prune-empty --subdirectory-filter third_party/WebKit/Source/devtools tracker1
else
  echo "tracker1 branch exists => using it as-is"
  git log -1 tracker1
fi

if ! git rev-parse --verify tracker2; then
  echo "tracker2 branch does not exist => filter it"
  git branch -f tracker2 "$SPLIT2_SHA_PARENT"
  git filter-branch -f --prune-empty --subdirectory-filter third_party/blink/renderer/devtools tracker2
else
  echo "tracker2 branch exists => using it as-is"
  git log -1 tracker2
fi

# note that my first attempt was to use git rebase, but that would rewrite committer metadata
if ! git rev-parse --verify tracker3; then
  # this will reparent first commit in tracker3 to point to our syntetised tracker1 branch
  # this will effectively replay all commits from tracker2 on top of last commit in tracker1
  echo "tracker3 branch does not exist => preparing it"
  git branch -f tracker3 tracker2
  git filter-branch -f --parent-filter '
      read parents
      if [ "$parents" = "" ]; then
          echo "-p tracker1"
      else
          echo "$parents"
      fi' tracker3
else
  echo "tracker3 branch exists => using it as-is"
  git log -1 tracker3
fi

git remote add dirac-devtools-frontend https://chromium.googlesource.com/devtools/devtools-frontend || true
git fetch dirac-devtools-frontend

POST_SPLIT2_SHA="4fd355cc40e2392987a17339663fa86d3c472a8d" # https://chromium.googlesource.com/devtools/devtools-frontend/+/4fd355cc40e2392987a17339663fa86d3c472a8d
POST_SPLIT2_SHA_PARENT=$(git rev-parse "$POST_SPLIT2_SHA^") # d638d21ae7e6d2ec9d06122ebe18cdbac6cb30f2

if [[ "$POST_SPLIT2_SHA_PARENT" != "d638d21ae7e6d2ec9d06122ebe18cdbac6cb30f2" ]]; then
  echo "unexpected state of devtools-frontend repo, expected '$POST_SPLIT2_SHA_PARENT' to be parent of '$POST_SPLIT2_SHA'"
  exit 2
fi

pushd third_party/devtools-frontend/src
DEVTOOLS_SHA=$(git rev-parse HEAD)
popd

git branch -f tracker4 "$DEVTOOLS_SHA"

# this will reparent $POST_SPLIT2_SHA to point to our syntetised tracker3 branch
# note we cannot use git rebase, that would rewrite committer metadata
git filter-branch -f --parent-filter "
    read parents
    if [ \"\$parents\" = \"-p $POST_SPLIT2_SHA_PARENT\" ]; then
        echo \"-p tracker3\"
    else
        echo \"\$parents\"
    fi" -- "$POST_SPLIT2_SHA_PARENT..tracker4"

git branch -f devtools tracker4

# now we add one extra commit on top
# this commit will add .chrome-rev.txt and .chrome-tag.txt files with source chrome revision/version

git checkout -f devtools

echo "$CHROME_REV" > .chrome-rev.txt
echo "$CHROME_TAG" > .chrome-tag.txt

git add .chrome-rev.txt
git add .chrome-tag.txt

git -c "user.name=BinaryAge Bot" -c "user.email=bot@binaryage.com" commit -m "update source chrome version"

# push to dirac's devtools branch
# see https://github.com/binaryage/dirac/tree/devtools
git push -f dirac devtools

# (optional) return back to chromium master branch
git checkout -f master
