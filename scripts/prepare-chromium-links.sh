#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

VERSION=$1

if [[ -n "$VERSION" ]]; then
  echo "looking up position for version $VERSION..."
  POSITION=$(./scripts/position-for-version.sh "${VERSION}")
  echo " => $POSITION"
else
  echo "looking up latest versions..."
fi

echo "----"

platforms="Mac Linux_x64 Win Win_x64"
for platform in ${platforms}; do
  set +e # lookup can fail, we don't provide a link in that case
  LINK=$(./scripts/lookup-chromium-link.sh "${platform}" "${POSITION}" | tail -n1)
  set -e
  if [[ -n "${LINK}" ]]; then
    echo "[$platform](${LINK})"
  else
    echo "$platform"
  fi
done
