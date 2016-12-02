#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

if [ ! -d "$NOTIFY_DIR" ] ; then
  mkdir -p "$NOTIFY_DIR"
fi

pushd "$NOTIFY_DIR"

touch "$1"
echo "${@:2}" >> "$1"

popd

popd
