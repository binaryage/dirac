#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

if [[ -n "$CANARY_CLOJURESCRIPT_VERSION" ]]; then
  echo "CANARY_CLOJURESCRIPT_VERSION is set, this would likely break the release - remove it from env before deploy"
  exit 1
fi

LIB_PROFILE=${1:-lib}

./scripts/list-jar.sh "${LIB_PROFILE}"

lein with-profile "${LIB_PROFILE}" install
