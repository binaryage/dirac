#!/usr/bin/env bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

pushd .

cd "$(dirname "${BASH_SOURCE[0]}")"; cd ..

ROOT=`pwd`
CHROMIUM_MIRROR_DIR="$ROOT/../chromium-mirror"
DEVTOOLS_BRANCH="devtools"
DEVTOOLS_CHROMIUM_PREFIX="third_party/WebKit/Source/devtools"
DEVTOOLS_DIRAC_PREFIX="resources/unpacked/devtools"

popd .