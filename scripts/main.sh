#!/usr/bin/env bash

# this script tries to launch dirac.main via lein
#
# usage ./main.sh [args]
#

set -e

ARGS=()
if [[ -t 1 ]] ; then
  # please note that lein run does some internal piping and prevents TTY detection, we have to force colors by hand
  # https://stackoverflow.com/a/29425613/84283
  ARGS+=("--force-color")
fi

# set -x
exec lein run -m dirac.main -- "${ARGS[@]}" "$@"
