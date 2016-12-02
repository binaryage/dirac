#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

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

popd
