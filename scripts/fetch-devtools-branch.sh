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
git fetch chromium/master
git checkout tracker
git merge chromium/master
git subtree split --rejoin --prefix="$DEVTOOLS_DIRAC_PREFIX" --branch "$DEVTOOLS_BRANCH"
git push dirac devtools
popd

popd