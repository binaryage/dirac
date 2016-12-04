#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

PLATFORM=${1:-Mac}
POSITION=$2
RANGE=${3:-100}

PLATFORM_ZIP="chrome-mac.zip"
if [[ "$PLATFORM" == Linux* ]]; then
  PLATFORM_ZIP="chrome-linux.zip"
fi
if [[ "$PLATFORM" == Win* ]]; then
  PLATFORM_ZIP="chrome-win32.zip"
fi

if [ -z "$POSITION" ] ; then
  echo -n "Determining latest build for $PLATFORM..."
  POSITION=`curl -s http://commondatastorage.googleapis.com/chromium-browser-snapshots/${PLATFORM}/LAST_CHANGE`
  echo "=> position is $POSITION"
fi

MIN_POSITION=`expr ${POSITION} - ${RANGE}`
for i in $(seq ${POSITION} ${MIN_POSITION}); do
  echo ${i};
  url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/$PLATFORM/$i/$PLATFORM_ZIP"
  if curl --output /dev/null --silent --head --fail "$url"; then
    echo "${url}"
    exit 0
  fi
done

echo "unable to find chromium for platform $PLATFORM in the range [$MIN_POSITION, $POSITION]"

exit 1

popd
