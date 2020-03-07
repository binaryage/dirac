#!/usr/bin/env bash

# this task is to be run after running release.sh script
# it copies release files and packages them into a zip file with versioned filename

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

if [[ ! -d "$RELEASE_BUILD" ]]; then
  echo "'$RELEASE_BUILD' does not exist, run 'lein release' first"
  exit 1
fi

if [[ ! -f "$RELEASE_BUILD_COMPILED_BACKGROUND_JS" ]]; then
  echo "'$RELEASE_BUILD_COMPILED_BACKGROUND_JS' does not exist, run 'lein release' to fully build the project"
  exit 2
fi

if [[ ! -f "$RELEASE_BUILD_COMPILED_OPTIONS_JS" ]]; then
  echo "'$RELEASE_BUILD_COMPILED_OPTIONS_JS' does not exist, run 'lein release' to fully build the project"
  exit 3
fi

if [[ ! -d "$RELEASES" ]]; then
  mkdir -p "$RELEASES"
fi

VERSION=$(grep "defproject" < "$PROJECT_FILE" | cut -d' ' -f3 | cut -d\" -f2)

PACKAGE_NAME="dirac-$VERSION"
PACKAGE_DIR="$RELEASES/$PACKAGE_NAME"
ZIP_NAME="$RELEASES/$PACKAGE_NAME.zip"

if [[ -d "$PACKAGE_DIR" ]]; then
  rm -rf "$PACKAGE_DIR"
fi

cp -r "$RELEASE_BUILD" "$PACKAGE_DIR" # this will copy actual files, not symlinks (if any)

cd "$PACKAGE_DIR"

if [[ -f "$ZIP_NAME" ]]; then
  rm "$ZIP_NAME"
fi

zip -qr -9 -X "$ZIP_NAME" .

unzip -l "$ZIP_NAME"

echo "'$ZIP_NAME' ready for upload => https://chrome.google.com/webstore/developer/dashboard"
