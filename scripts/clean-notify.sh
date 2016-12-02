#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

if [ -d "$NOTIFY_DIR" ] ; then
  rm -rf "$NOTIFY_DIR"
fi

popd
