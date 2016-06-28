#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

./scripts/list-jar.sh

lein with-profile lib install

popd
