#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

END_TAG=${1:-`git describe --tags --match "v*" --abbrev=0 "HEAD"`}
START_TAG=`git describe --tags --match "v*" --abbrev=0 "$END_TAG^"`
RANGE="$START_TAG..$END_TAG"

echo "RANGE=$RANGE"

SQUASHES=`git log --oneline ${RANGE} | grep "squash 'resources/unpacked/devtools'"`

FIRST_SQUASH=`echo "$SQUASHES" | tail -n 1`
LAST_SQUASH=`echo "$SQUASHES" | head -n 1`

if [ ! -z "$FIRST_SQUASH" ] ; then
  FIRST_SQUASH_RANGE=`echo "$FIRST_SQUASH" | cut -d " " -f 6`
  LAST_SQUASH_RANGE=`echo "$LAST_SQUASH" | cut -d " " -f 6`

  MERGED_RANGE_START=`echo "${FIRST_SQUASH_RANGE/../-}" | cut -d "-" -f 1`
  MERGED_RANGE_END=`echo "${LAST_SQUASH_RANGE/../-}" | cut -d "-" -f 2`
  MERGED_DEVTOOLS_RANGE="$MERGED_RANGE_START...$MERGED_RANGE_END"
fi
echo "MERGED_DEVTOOLS_RANGE=$MERGED_DEVTOOLS_RANGE"

FROM_OFFICIAL_DEVTOOLS="from [official DevTools](https://developer.chrome.com/devtools)"

CHROME_VERSION=`${SCRIPTS}/extract-backend-protocol-chrome-version.sh "$END_TAG"`
echo "CHROME_VERSION=$CHROME_VERSION"

LINKS=`${SCRIPTS}/prepare-chromium-links.sh "$CHROME_VERSION" | tail -n 4 | tr '\n' "@" | sed 's/@$//' | sed 's/@/ | /g'`

echo
echo "<--- cut here"
echo "## Rolling DevTools"
echo ""
if [ ! -z "$MERGED_DEVTOOLS_RANGE" ] ; then
  echo "Merged commits $MERGED_DEVTOOLS_RANGE $FROM_OFFICIAL_DEVTOOLS."
else
  echo "Merged no commits $FROM_OFFICIAL_DEVTOOLS."
fi
echo "Should [work best](https://github.com/binaryage/dirac/blob/master/docs/faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) with Chrome ~$CHROME_VERSION."
echo "Links to matching [Chromium snapshots](https://www.chromium.org/getting-involved/download-chromium): $LINKS."

popd

popd
