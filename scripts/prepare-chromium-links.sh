#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

VERSION=$1

if [ ! -z "$VERSION" ] ; then
  echo "looking up position for version $VERSION..."
  POSITION=`./scripts/position-from-version.sh ${VERSION}`
  echo " => $POSITION"
else
  echo "looking up latest versions..."
fi

echo "----"

platforms="Mac Linux_x64 Win Win_x64"
for platform in ${platforms}; do
  LINK=`./scripts/lookup-chromium-link.sh ${platform} ${POSITION} | tail -n1`
  echo "[$platform](${LINK})"
done

popd
