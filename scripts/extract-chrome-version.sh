#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

SHA=${1:-HEAD}

MERGE_SHA=$("$SCRIPTS/find-devtools-merge-sha.sh" "$SHA")

FULL_MESSAGE=$(git log --max-count=1 --date=default --pretty=full "$MERGE_SHA")

#FULL_MESSAGE=$(cat << EOF
#commit ab61c4f00888c9b4e99c0077fe7f7208b4831dd1
#Merge: 97c41dd48 ed96a88e2
#Author: Antonin Hildebrand <antonin@hildebrand.cz>
#Commit: Antonin Hildebrand <antonin@hildebrand.cz>
#
#    merge updates from official devtools
#
#    CHROME-REV:abc
#    CHROME-TAG:205.2.30
#    SOME-OTHER-DATA:xyz
#EOF
#)

if [[ ! "$FULL_MESSAGE" =~ ^.*CHROME-TAG:([0-9.]*).*$ ]]; then
  printf "unable to find CHROME-TAG in commit message of '%s':\n%s" "$MERGE_SHA" "$FULL_MESSAGE"
  exit 1
fi

echo "${BASH_REMATCH[1]}"
