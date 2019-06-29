#!/usr/bin/env bash

set -ex

# this will combine stdout and stderr and tee logs into syslog as well
# see http://elevated-dev.com/TechTips/Launchd%20&%20Logging/
exec 1> >(tee >(logger -t "chromex auto-job")) 2>&1

die_if_dirty_working_copy () {
  if [[ -n "$(git status -uno --porcelain)" ]]; then
    echo "working copy is not clean in '$(pwd)'"
    exit 1
  fi
}

# ensure we start in scripts folder
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ROOT="$(pwd)"
SCRIPTS="$ROOT/scripts"

# update our code to latest
git fetch origin
git checkout -B master origin/master

exec "$SCRIPTS/health-check.sh"
