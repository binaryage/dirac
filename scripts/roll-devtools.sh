#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

set -x

git pull
./scripts/pull-devtools.sh
./scripts/squash-and-merge-official-updates.sh
./scripts/regenerate.sh
