#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

PLATFORM=${1:-Mac}
POSITION=$2
RANGE=${3:-100}

PLATFORM_ZIP="chrome-mac.zip"
if [[ "$PLATFORM" == Linux* ]]; then
  PLATFORM_ZIP="chrome-linux.zip"
fi
if [[ "$PLATFORM" == Win* ]]; then
  PLATFORM_ZIP="chrome-win.zip"
fi

if [[ -z "$POSITION" ]]; then
  echo -n "Determining latest build for $PLATFORM..."
  POSITION=$(curl -s "http://commondatastorage.googleapis.com/chromium-browser-snapshots/${PLATFORM}/LAST_CHANGE")
  echo "=> position is $POSITION"
fi

# shellcheck disable=SC2086
# shellcheck disable=SC2003
MIN_POSITION=$(expr ${POSITION} - ${RANGE})
# shellcheck disable=SC2086
for i in $(seq ${POSITION} -1 ${MIN_POSITION}); do
  echo ${i};
  url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/$PLATFORM/$i/$PLATFORM_ZIP"
  if curl --output /dev/null --silent --head --fail "$url"; then
    echo "${url}"
    exit 0
  fi
done

echoerr "unable to find chromium for platform $PLATFORM in the range [$MIN_POSITION, $POSITION]"

echo ""
exit 1
