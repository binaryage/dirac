#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

END_TAG=${1:-$(git describe --tags --match "v*" --abbrev=0 "HEAD")}
START_TAG=$(git describe --tags --match "v*" --abbrev=0 "$END_TAG^")
RANGE="$START_TAG..$END_TAG"
OVERRIDE_CHROME_VERSION=${OVERRIDE_CHROME_VERSION}

echo "RANGE=$RANGE"

#set -x

# the goal here is:
# 1. given RANGE of commits in binaryage/dirac repo (usually two release tags)
# 2. determine corresponding MERGED_DEVTOOLS_RANGE of commits
#    in binaryage/devtools-frontend repo (via devtools-frontend submodule)
# 3. determine corresponding MERGED_UPSTREAM_RANGE from upstream repo
#    we do it by listing all merge commits in MERGED_DEVTOOLS_RANGE
#    we take first(recent) and last, with last we retrieve one more (aka previous one, which was the first in previous release)
#    we construct upstream range by taking right-side parent of recent and previous commits
#    they should correspond to proper commit range in upstream repo
# - we also handle edge cases previous commits cannot be determined
FIRST_UPDATE=$(git ls-tree "$START_TAG" devtools-frontend | cut -d " " -f 3 | cut -d$'\t' -f 1)
LAST_UPDATE=$(git ls-tree "$END_TAG" devtools-frontend | cut -d " " -f 3 | cut -d$'\t' -f 1)

if [[ -z "$FIRST_UPDATE" ]]; then
  # hard-code first update (special case in release v1.6.1)
  FIRST_UPDATE="ea2a4adced5c03647c350c8d4a2aa82419c02dde"
fi
MERGED_DEVTOOLS_RANGE="$FIRST_UPDATE...$LAST_UPDATE"
echo "MERGED_DEVTOOLS_RANGE=$MERGED_DEVTOOLS_RANGE"

# list merge commits
cd devtools-frontend
MERGES=$(git log --merges --pretty=%H $MERGED_DEVTOOLS_RANGE)

FIRST_MERGE=$(echo "$MERGES" | tail -n 1)
RECENT_MERGE=$(echo "$MERGES" | head -n 1)
PREVIOUS_MERGE=$(git log --merges --pretty=%H "$FIRST_MERGE^")

if [[ -z "$PREVIOUS_MERGE" ]]; then
  # hard-code first case, this is last merge from v1.6.1 release
  PREVIOUS_MERGE_PARENT2="27e34c81d4684c51ada839f9526be378174bbcc4"
else
  # take right parent of the merge
  PREVIOUS_MERGE_PARENT2=$(git show -s --pretty=%P $PREVIOUS_MERGE | cut -d " " -f 2)
fi

RECENT_MERGE_PARENT2=$(git show -s --pretty=%P $RECENT_MERGE | cut -d " " -f 2)

MERGED_UPSTREAM_RANGE=$PREVIOUS_MERGE_PARENT2...$RECENT_MERGE_PARENT2
echo "MERGED_UPSTREAM_RANGE=$MERGED_UPSTREAM_RANGE"

cd ..

if [[ -z "$OVERRIDE_CHROME_VERSION" ]]; then
  CHROME_VERSION=$(curl -s -S https://omahaproxy.appspot.com/all | grep "mac,canary" | cut -d , -f 3)
else
  CHROME_VERSION="$OVERRIDE_CHROME_VERSION"
fi
echo "CHROME_VERSION=$CHROME_VERSION"

LINKS=$("${SCRIPTS}/prepare-chromium-links.sh" "$CHROME_VERSION" | tail -n 4 | tr '\n' "@" | sed 's/@$//' | sed 's/@/ | /g')

echo
echo "<--- cut here"
echo "## Rolling DevTools"
echo ""
FROM_OFFICIAL_DEVTOOLS="from [official DevTools](https://github.com/ChromeDevTools/devtools-frontend)"
if [[ -n "$MERGED_DEVTOOLS_RANGE" ]]; then
  echo "Merged commits https://github.com/ChromeDevTools/devtools-frontend/compare/$MERGED_UPSTREAM_RANGE $FROM_OFFICIAL_DEVTOOLS."
else
  echo "Merged no commits $FROM_OFFICIAL_DEVTOOLS."
fi
echo "Should [work best](https://github.com/binaryage/dirac/blob/master/docs/faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) with Chrome ~$CHROME_VERSION."
echo "Links to matching [Chromium snapshots](https://www.chromium.org/getting-involved/download-chromium): $LINKS."
