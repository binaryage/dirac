#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

END_TAG=${1:-`git describe --tags --match "v*" --abbrev=0 "HEAD"`}
START_TAG=`git describe --tags --match "v*" --abbrev=0 "$END_TAG^"`
RANGE="$START_TAG..$END_TAG"
OVERRIDE_CHROME_VERSION=${OVERRIDE_CHROME_VERSION}

echo "RANGE=$RANGE"

SQUASHES=`git log --oneline ${RANGE} | grep "squash 'resources/unpacked/devtools'"`

FIRST_SQUASH=`echo "$SQUASHES" | tail -n 1`
LAST_SQUASH=`echo "$SQUASHES" | head -n 1`

if [[ ! -z "$FIRST_SQUASH" ]]; then
  FIRST_SQUASH_RANGE=`echo "$FIRST_SQUASH" | cut -d " " -f 6`
  LAST_SQUASH_RANGE=`echo "$LAST_SQUASH" | cut -d " " -f 6`

  MERGED_RANGE_START=`echo "${FIRST_SQUASH_RANGE/../-}" | cut -d "-" -f 1`
  MERGED_RANGE_END=`echo "${LAST_SQUASH_RANGE/../-}" | cut -d "-" -f 2`
  MERGED_DEVTOOLS_RANGE="$MERGED_RANGE_START...$MERGED_RANGE_END"
fi
echo "MERGED_DEVTOOLS_RANGE=$MERGED_DEVTOOLS_RANGE"

FROM_OFFICIAL_DEVTOOLS="from [official DevTools](https://developers.google.com/web/tools/chrome-devtools)"

if [[ -z "$OVERRIDE_CHROME_VERSION" ]]; then
  CHROME_VERSION=`${SCRIPTS}/extract-backend-protocol-chrome-version.sh "$END_TAG"`
else
  CHROME_VERSION="$OVERRIDE_CHROME_VERSION"
fi
echo "CHROME_VERSION=$CHROME_VERSION"

LINKS=`${SCRIPTS}/prepare-chromium-links.sh "$CHROME_VERSION" | tail -n 4 | tr '\n' "@" | sed 's/@$//' | sed 's/@/ | /g'`

echo
echo "<--- cut here"
echo "## Rolling DevTools"
echo ""
if [[ ! -z "$MERGED_DEVTOOLS_RANGE" ]]; then
  echo "Merged commits https://github.com/binaryage/dirac/compare/$MERGED_DEVTOOLS_RANGE $FROM_OFFICIAL_DEVTOOLS."
else
  echo "Merged no commits $FROM_OFFICIAL_DEVTOOLS."
fi
echo "Should [work best](https://github.com/binaryage/dirac/blob/master/docs/faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) with Chrome ~$CHROME_VERSION."
echo "Links to matching [Chromium snapshots](https://www.chromium.org/getting-involved/download-chromium): $LINKS."

popd
