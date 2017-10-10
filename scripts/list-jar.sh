#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

LIB_PROFILE=${1:-lib}

./scripts/check-versions.sh

lein with-profile "${LIB_PROFILE}" jar

LEIN_VERSION=`cat "$PROJECT_FILE" | grep "defproject" | cut -d' ' -f3 | cut -d\" -f2`
BASE_FILE="dirac-$LEIN_VERSION"
POM_PATH="META-INF/maven/binaryage/dirac/pom.xml"

cd target
unzip -l "$BASE_FILE.jar"
unzip "$BASE_FILE.jar" "$POM_PATH" -d inspect

echo
echo "approx. pom.xml dependencies:"
cat "inspect/$POM_PATH" | grep -E -i "artifactId|version"

echo
echo "----------------------------"
echo

popd
