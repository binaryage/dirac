#!/usr/bin/env bash

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

set -ex

pushd () {
  command pushd "$@" > /dev/null
}

popd () {
  command popd "$@" > /dev/null
}

die_if_dirty_working_copy () {
  if [[ -n "$(git status -uno --porcelain)" ]]; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

#############################################################################################################################

pushd .

# ensure we start in root folder
cd "$(dirname "${BASH_SOURCE[0]}")"; cd ../..

ROOT=$(pwd)
DIRAC="$ROOT/dirac"

#############################################################################################################################
# update dirac devtools branch

pushd "$DIRAC"

die_if_dirty_working_copy

git fetch origin

git checkout master
git reset --hard origin/master
git clean -fd

time ./scripts/fetch-devtools-branch.sh

time ./scripts/diff-upstream.sh HEAD 1

popd

popd
