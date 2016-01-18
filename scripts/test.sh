#!/usr/bin/env bash

set -ex

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

lein deps :tree

lein test

popd