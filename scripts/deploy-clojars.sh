#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

LIB_PROFILES="lib"

cd "$ROOT"

if [[ -n "$CANARY_CLOJURESCRIPT_VERSION" ]]; then
  echo "CANARY_CLOJURESCRIPT_VERSION is set, this would likely break the release - remove it from env before deploy"
  exit 1
fi

./scripts/list-jar.sh "$LIB_PROFILES"

LEIN_VERSION=$(grep "defproject" <"$PROJECT_FILE" | cut -d' ' -f3 | cut -d\" -f2)

# http://stackoverflow.com/a/1885534/84283
echo "Are you sure to publish version ${LEIN_VERSION}? [Yy]"
read -n 1 -r
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
  lein with-profile "$LIB_PROFILES" deploy clojars
else
  exit 1
fi
