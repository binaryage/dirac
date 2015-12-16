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
CHROMIUM_MIRROR_DEVTOOLS_DIR="$CHROMIUM_MIRROR_DIR/$DEVTOOLS_CHROMIUM_PREFIX"
DEVTOOLS_DIRAC_PREFIX="resources/unpacked/devtools"
DEVTOOLS_ROOT="$ROOT/$DEVTOOLS_DIRAC_PREFIX"
DIRAC_USER_PROFILE=${DIRAC_USER_PROFILE:-".profiles/dirac"}
DEVSERVER_ROOT="$DEVTOOLS_ROOT"
DEVSERVER_PORT=9000

popd .