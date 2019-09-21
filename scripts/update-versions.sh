#!/usr/bin/env bash

# updates all version strings

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

VERSION=$1

if [[ -z "$VERSION" ]]; then
  echo "please specify version as the first argument"
  exit 1
fi

sed -i "" -e "s/defproject binaryage\/dirac \".*\"/defproject binaryage\/dirac \"$VERSION\"/g" "$PROJECT_FILE"
sed -i "" -e "s/def version \".*\"/def version \"$VERSION\"/g" "$PROJECT_VERSION_FILE"
sed -i "" -e "s/\"version\"\: \".*\"/\"version\": \"$VERSION\"/g" "$UNPACKED_MANIFEST_FILE"
sed -i "" -e "s/\"version\"\: \".*\"/\"version\": \"$VERSION\"/g" "$RELEASE_MANIFEST_FILE"
sed -i "" -e "s/dirac-version \".*\"/dirac-version \"$VERSION\"/g" "$EXAMPLES_LEININGEN_PROJECT_FILE"
sed -i "" -E "s/binaryage\\/dirac([ ]*){:mvn\\/version \".*\"}/binaryage\\/dirac\\1{:mvn\\/version \"$VERSION\"}/g" "$EXAMPLES_FIGMAIN_DEPS_FILE"

# this is just a sanity check
./scripts/check-versions.sh
