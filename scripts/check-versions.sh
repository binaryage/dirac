#!/usr/bin/env bash

# checks if all version strings are consistent

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

LEIN_VERSION=`cat "$PROJECT_FILE" | grep "defproject" | cut -d' ' -f3 | cut -d\" -f2`

# same version must be in src/project/dirac/project.clj
# and in manifest files resources/unpacked/manifest.json, resources/release/manifest.json

PROJECT_VERSION=`cat "$PROJECT_VERSION_FILE" | grep "(def version" | cut -d" " -f3 | cut -d\" -f2`
if [ -z "$PROJECT_VERSION" ] ; then
  echo "Unable to retrieve version string from '$PROJECT_VERSION_FILE'"
  popd
  exit 1
fi

if [ ! "$LEIN_VERSION" = "$PROJECT_VERSION" ] ; then
  echo "Lein's project.clj version differs from version in '$PROJECT_VERSION_FILE': '$LEIN_VERSION' != '$PROJECT_VERSION'"
  popd
  exit 2
fi

UNPACKED_MANIFEST_VERSION=`cat "$UNPACKED_MANIFEST_FILE" | grep "\"version\":" | cut -d" " -f4 | cut -d\" -f2`
if [ -z "$UNPACKED_MANIFEST_VERSION" ] ; then
  echo "Unable to retrieve version string from '$UNPACKED_MANIFEST_FILE'"
  popd
  exit 3
fi

if [ ! "$LEIN_VERSION" = "$UNPACKED_MANIFEST_VERSION" ] ; then
  echo "Lein's project.clj version differs from version in '$UNPACKED_MANIFEST_FILE': '$LEIN_VERSION' != '$UNPACKED_MANIFEST_VERSION'"
  popd
  exit 4
fi

RELEASE_MANIFEST_VERSION=`cat "$RELEASE_MANIFEST_FILE" | grep "\"version\":" | cut -d" " -f4 | cut -d\" -f2`
if [ -z "$RELEASE_MANIFEST_VERSION" ] ; then
  echo "Unable to retrieve version string from '$RELEASE_MANIFEST_FILE'"
  popd
  exit 5
fi

if [ ! "$LEIN_VERSION" = "$RELEASE_MANIFEST_VERSION" ] ; then
  echo "Lein's project.clj version differs from version in '$RELEASE_MANIFEST_FILE': '$LEIN_VERSION' != '$RELEASE_MANIFEST_VERSION'"
  popd
  exit 6
fi

echo "All version strings are consistent: '$LEIN_VERSION'"

popd

popd
