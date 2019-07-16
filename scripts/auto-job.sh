#!/usr/bin/env bash

set -ex

echo "-----------------------------------------------------------------------------------------------------------------------"
echo "running ${BASH_SOURCE[0]} on $(date)"

echo "ENVIRONMENT:"
env

finish () {
  echo "finished ${BASH_SOURCE[0]} on $(date)"
  echo
  echo
}
trap finish EXIT

CHROMIUM_MIRROR_DIR=${CHROMIUM_MIRROR_DIR:?please specify CHROMIUM_MIRROR_DIR} # ~/tasks/chromium/src/

die_if_dirty_working_copy () {
  if [[ -n "$(git status -uno --porcelain)" ]]; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

#############################################################################################################################

# ensure we start in root folder
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

ROOT="$(pwd)"
DIRAC="$ROOT/dirac"

#############################################################################################################################
# update dirac devtools branch

cd "$DIRAC"

die_if_dirty_working_copy

git fetch origin

git checkout -f -B master origin/master
git clean -ffd

time ./scripts/fetch-devtools-branch.sh
time ./scripts/diff-upstream.sh HEAD 1