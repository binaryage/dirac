#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

LIB_PROFILES="lib"

cd "$ROOT"

./scripts/list-jar.sh "$LIB_PROFILES"

LEIN_VERSION=`cat "$PROJECT_FILE" | grep "defproject" | cut -d' ' -f3 | cut -d\" -f2`

# http://stackoverflow.com/a/1885534/84283
echo "Are you sure to publish version ${LEIN_VERSION}? [Yy]"
read -n 1 -r
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
  lein with-profile "$LIB_PROFILES" deploy clojars
else
  exit 1
fi
