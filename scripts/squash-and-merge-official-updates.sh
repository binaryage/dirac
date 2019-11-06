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

cd "$DEVTOOLS_WORKTREE"

BRANCH_REV=$(git rev-parse "$DEVTOOLS_BRANCH")

die_if_dirty_working_copy

# at this point we should have latest upstream changes in devtools branch
echo "hint: to update devtools branch to the latest version run: ./scripts/pull-devtools.sh"

HEAD_REV=$(git rev-parse HEAD)

if [[ "$BRANCH_REV" != "$HEAD_REV" ]]; then
  echo "failed: branch revision of '$DEVTOOLS_BRANCH' branch must be the same as checkout of '$DEVTOOLS_WORKTREE'"
  exit 1
fi

if [[ ! -f .chrome-rev.txt ]]; then
  echo "failed: '.chrome-rev.txt' file expected to be present in '$DEVTOOLS_WORKTREE'"
  exit 2
fi

if [[ ! -f .chrome-rev.txt ]]; then
  echo "failed: '.chrome-tag.txt' file expected to be present in '$DEVTOOLS_WORKTREE'"
  exit 3
fi

CHROME_REV=$(head -n 1 .chrome-rev.txt)
CHROME_TAG=$(head -n 1 .chrome-tag.txt)

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

cd "$ROOT"

LAST_LOG_MSG=$(git log --oneline "$BRANCH_REV" -1)
if [[ ! "$LAST_LOG_MSG" == *"source chrome version"* ]]; then
  echo "failed: expected branch '$DEVTOOLS_BRANCH' to contain last commit with 'source chrome version' substring in commit message"
  echo "        this should be prepared by fetch-devtools-branch.sh"
  exit 4
fi

SQUASH_END_REV=$(git rev-parse "$BRANCH_REV^")

# note: my-subtree is just my patched version of subtree command with github-friendly commit messages (SHAs are clickable)
COMMIT_MSG=$(cat <<EOF
merge updates from official devtools

CHROME-REV:$CHROME_REV
CHROME-TAG:$CHROME_TAG
EOF
)

git my-subtree merge --prefix="$DEVTOOLS_DIRAC_PREFIX" --squash "$SQUASH_END_REV" -m "$COMMIT_MSG" "$@"
