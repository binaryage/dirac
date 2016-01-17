#!/usr/bin/env bash

# this script moves checkouts out runs lein and returns checkouts back
#
# usage ./lein-without-checkouts.sh [args]
#

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

function move_checkouts_back {
  mv checkouts_ checkouts
}

function move_checkouts_out {
  mv checkouts checkouts_
}

pushd "$ROOT"

if [ -d "checkouts" ] ; then
  move_checkouts_out
  trap move_checkouts_back EXIT
fi

lein with-profile "+nuke-aliases" "$@"

popd