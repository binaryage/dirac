#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/clear-notify.sh

rm -rf "resources/unpacked/compiled"
rm -rf "resources/unpacked/devtools/front_end/dirac/compiled"
rm -rf "resources/release/compiled"
rm -rf "test/browser/fixtures/resources/compiled"
rm -rf "test/marion/resources/unpacked/compiled"

popd

popd
