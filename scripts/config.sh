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
CHROMIUM_MIRROR_DIR=${CHROMIUM_MIRROR_DIR:-"$ROOT/../chromium-mirror"}
DEVTOOLS_BRANCH="devtools"
DIFF_BRANCH="devtools-diff"
DEVTOOLS_CHROMIUM_PREFIX="third_party/WebKit/Source/devtools"
CHROMIUM_MIRROR_DEVTOOLS_DIR="$CHROMIUM_MIRROR_DIR/$DEVTOOLS_CHROMIUM_PREFIX"
DEVTOOLS_DIRAC_PREFIX="resources/unpacked/devtools"
DEVTOOLS_ROOT="$ROOT/$DEVTOOLS_DIRAC_PREFIX"
DIRAC_USER_PROFILE=${DIRAC_USER_PROFILE:-".profiles/dirac"}
DEVSERVER_ROOT="$DEVTOOLS_ROOT"
DEVSERVER_PORT=9000
RELEASES="$ROOT/releases"
RELEASE_BUILD="$ROOT/resources/release"
RELEASE_BUILD_COMPILED="$RELEASE_BUILD/compiled"
CSS_PROPERTIES_SOURCE="$CHROMIUM_MIRROR_DEVTOOLS_DIR/../core/css/CSSProperties.in"
CSS_PROPERTIES_OUTPUT_FILE="$DEVTOOLS_ROOT/front_end/SupportedCSSProperties.js"
INSPECTOR_BACKEND_COMMANDS_OUTPUT_FILE="$DEVTOOLS_ROOT/front_end/InspectorBackendCommands.js"
SCRIPTS="$ROOT/scripts"
DIFF_WORK_DIR="$ROOT/../diff-upstream"
PROJECT_VERSION_FILE="src/project/dirac/version.clj"
UNPACKED_MANIFEST_FILE="resources/unpacked/manifest.json"
RELEASE_MANIFEST_FILE="resources/release/manifest.json"
PROJECT_FILE="project.clj"
DEVTOOLS_WORKTREE="$ROOT/../devtools"

popd