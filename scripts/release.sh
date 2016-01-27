#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

./scripts/check-versions.sh

if [ -z "$1" ] ; then
  lein compile-release
else
  lein compile-release-pseudo-names
fi

popd