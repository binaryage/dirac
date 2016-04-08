#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

if [ ! -d "$NOTIFY_DIR" ] ; then
  mkdir -p "$NOTIFY_DIR"
fi

pushd "$NOTIFY_DIR"

touch "$1"
echo "${@:2}" >> "$1"

popd