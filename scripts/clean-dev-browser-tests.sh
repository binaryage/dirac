#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

rm -rf "resources/unpacked/.compiled"
rm -rf "resources/unpacked/devtools/front_end/dirac/.compiled"
rm -rf "test/browser/fixtures/resources/.compiled"
rm -rf "test/marion/resources/unpacked/.compiled"

popd
