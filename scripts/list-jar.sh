#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

LIB_PROFILES=${1:-lib}

./scripts/check-versions.sh

lein with-profile "${LIB_PROFILES}" jar

LEIN_VERSION=$(grep "defproject" < "$PROJECT_FILE"| cut -d' ' -f3 | cut -d\" -f2)
BASE_FILE="dirac-$LEIN_VERSION"
POM_PATH="META-INF/maven/binaryage/dirac/pom.xml"

cd target
unzip -l "$BASE_FILE.jar"
unzip "$BASE_FILE.jar" "$POM_PATH" -d inspect

echo
echo "approx. pom.xml dependencies:"
grep -E -i "artifactId|version" < "inspect/$POM_PATH"

echo
echo "----------------------------"
echo
