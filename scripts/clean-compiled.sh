#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/clear-notify.sh

rm -rf "resources/unpacked/_compiled"
rm -rf "resources/unpacked/devtools/front_end/dirac/_compiled"
rm -rf "test/browser/fixtures/resources/_compiled"
rm -rf "test/marion/resources/unpacked/_compiled"

popd

popd
