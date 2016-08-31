#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

die_if_dirty_working_copy () {
  if [ -n "$(git status -uno --porcelain)" ] ; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

pushd "$ROOT"

die_if_dirty_working_copy

git fetch origin devtools

# at this point we should have latest upstream changes in devtools branch
echo "hint: to update devtools branch to the latest version run: ./scripts/pull-devtools-branch.sh"

# A note about initial setup
#
# git subtree needs some starting point, you use git subtree add:
#
#   git subtree add --prefix=resources/unpacked/devtools --squash devtools
#
# consequent merges are done via
#
#   git subtree merge --prefix=resources/unpacked/devtools --squash devtools
#
# read more docs here: https://github.com/apenwarr/git-subtree/blob/master/git-subtree.txt

# note: my-subtree is just my patched version of subtree command with github-friendly commit messages (SHAs are clickable)
git my-subtree merge --prefix="$DEVTOOLS_DIRAC_PREFIX" --squash "$DEVTOOLS_BRANCH" -m "merge updates from official devtools" "$@"

popd

popd
