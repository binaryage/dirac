#!/usr/bin/env bash

# updates all version strings

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

VERSION=$1

if [ -z "$VERSION" ] ; then
  echo "please specify version as the first argument"
  popd
  exit 1
fi

sed -i "" -e "s/defproject binaryage\/dirac \".*\"/defproject binaryage\/dirac \"$VERSION\"/g" "$PROJECT_FILE"
sed -i "" -e "s/def version \".*\"/def version \"$VERSION\"/g" "$PROJECT_VERSION_FILE"
sed -i "" -e "s/\"version\"\: \".*\"/\"version\": \"$VERSION\"/g" "$UNPACKED_MANIFEST_FILE"
sed -i "" -e "s/\"version\"\: \".*\"/\"version\": \"$VERSION\"/g" "$RELEASE_MANIFEST_FILE"

# this is just a sanity check
./scripts/check-versions.sh

popd
