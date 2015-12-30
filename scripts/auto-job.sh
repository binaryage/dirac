#!/usr/bin/env bash

echo "-----------------------------------------------------------------------------------------------------------------------"
echo "running auto-job.sh on $(date)"

export CHROMIUM_MIRROR_DIR=~/tasks/chromium/src/

set -ex

pushd () {
  command pushd "$@" > /dev/null
}

popd () {
  command popd "$@" > /dev/null
}

die_if_dirty_working_copy () {
  if [ -n "$(git status -uno --porcelain)" ] ; then
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

popd

popd