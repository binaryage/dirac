#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

VERSION=$1

if [ ! -z "$VERSION" ] ; then
  POSITION=`curl -s "https://omahaproxy.appspot.com/deps.json?version=$VERSION"| python -mjson.tool | grep chromium_base_position | cut -d ":" -f 2 | sed "s/[ ,\"]//g"`
  echo "$POSITION"
else
  popd
  popd
  exit 1
fi

popd
