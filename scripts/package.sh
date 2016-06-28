#!/usr/bin/env bash

# this task is to be run after running release.sh script
# it copies release files and packages them into a zip file with versioned filename

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

if [ ! -f "$CSS_PROPERTIES_OUTPUT_FILE" ] ; then
  echo "'$CSS_PROPERTIES_OUTPUT_FILE' does not exist, run './scripts/regenerate.sh' first"
  popd
  exit 10
fi

if [ ! -f "$INSPECTOR_BACKEND_COMMANDS_OUTPUT_FILE" ] ; then
  echo "'$INSPECTOR_BACKEND_COMMANDS_OUTPUT_FILE' does not exist, run './scripts/regenerate.sh' first"
  popd
  exit 11
fi

if [ ! -d "$RELEASE_BUILD" ] ; then
  echo "'$RELEASE_BUILD' does not exist, run 'lein release' first"
  popd
  exit 1
fi

if [ ! -d "$RELEASE_BUILD_COMPILED" ] ; then
  echo "'$RELEASE_BUILD_COMPILED' does not exist, run 'lein release' to fully build the project"
  popd
  exit 2
fi

if [ ! -d "$RELEASES" ] ; then
  mkdir -p "$RELEASES"
fi

VERSION=`cat "$PROJECT_FILE" | grep "defproject" | cut -d' ' -f3 | cut -d\" -f2`

PACKAGE_NAME="dirac-$VERSION"
PACKAGE_DIR="$RELEASES/$PACKAGE_NAME"
ZIP_NAME="$RELEASES/$PACKAGE_NAME.zip"

if [ -d "$PACKAGE_DIR" ] ; then
  rm -rf "$PACKAGE_DIR"
fi

cp -r "$RELEASE_BUILD" "$PACKAGE_DIR" # this will copy actual files, not symlinks (if any)

pushd "$PACKAGE_DIR"

(cd "$dir" && zip -qr -9 -X "$ZIP_NAME" .)

echo "'$ZIP_NAME' ready for upload => https://chrome.google.com/webstore/developer/dashboard"

popd

popd
