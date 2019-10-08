#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

VERSION=$1

if [[ -n "$VERSION" ]]; then
  OMAHA_URL="https://omahaproxy.appspot.com/deps.json?version=$VERSION"
  POSITION=$(curl -s "$OMAHA_URL"| python -mjson.tool | grep chromium_base_position | cut -d ":" -f 2 | sed "s/[ ,\"]//g")

  if [[ "$POSITION" == "null" ]] || [[ -z "$POSITION" ]]; then
    echoerr "unable to determine chrome position for version '$VERSION', $OMAHA_URL returned null chromium_base_position"
    echoerr "this could happen when given version does not exist because of test/build failures"
    echoerr "use 'env OVERRIDE_CHROME_VERSION=version' to override broken version for this script"
    exit 2
  fi

  echo "$POSITION"
else
  popd
  popd
  exit 1
fi
