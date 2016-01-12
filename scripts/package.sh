#!/usr/bin/env bash

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

VERSION_WITH_QUOTES=`cat project.clj | grep "defproject" | cut -d' ' -f3`
VERSION=`echo "${VERSION_WITH_QUOTES//\"}"`

PACKAGE_NAME="dirac-$VERSION"
PACKAGE_DIR="$RELEASES/$PACKAGE_NAME"
ZIP_NAME="$RELEASES/$PACKAGE_NAME.zip"

if [ -d "$PACKAGE_DIR" ] ; then
  rm -rf "$PACKAGE_DIR"
fi

cp -r "$RELEASE_BUILD" "$PACKAGE_DIR" # this will copy actual files, not symlinks

# prune release directory from extra files/folders
rm -rf "$PACKAGE_DIR/compiled/background"
rm -rf "$PACKAGE_DIR/compiled/options"

mv "$PACKAGE_DIR/devtools/front_end/inspector-release.html" "$PACKAGE_DIR/devtools/front_end/inspector.html"
mv "$PACKAGE_DIR/devtools/front_end/dirac/compiled/implant.js" "$PACKAGE_DIR/devtools/front_end/dirac/implant.js"
rm -rf "$PACKAGE_DIR/devtools/front_end/dirac/compiled"
mkdir "$PACKAGE_DIR/devtools/front_end/dirac/compiled"
mv "$PACKAGE_DIR/devtools/front_end/dirac/implant.js" "$PACKAGE_DIR/devtools/front_end/dirac/compiled/implant.js"

rm "$PACKAGE_DIR/devtools/front_end/dirac/goog-base-setup.js"
rm "$PACKAGE_DIR/devtools/front_end/dirac/require-implant.js"

#echo "'$PACKAGE_DIR' prepared for packing"
#echo "  use Chrome's Window -> Extensions -> 'Pack extension...' to package it"
#echo "  or => https://developer.chrome.com/extensions/packaging#packaging"

pushd "$PACKAGE_DIR"

# "$SCRIPTS/crxmake.sh" "$PACKAGE_DIR" ""

(cd "$dir" && zip -qr -9 -X "$ZIP_NAME" .)

echo "'$ZIP_NAME' ready for upload => https://chrome.google.com/webstore/developer/dashboard"

popd

popd