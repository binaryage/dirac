#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

GIT_ORIGIN=${1:-b}
GIT_BRANCH=${2:-master}

cd "$ROOT"
git fetch "$GIT_ORIGIN"
REMOTE_HEAD="$GIT_ORIGIN/$GIT_BRANCH"
DEVTOOLS_SUBMODULE_COMMIT=$(git ls-tree "$REMOTE_HEAD" | grep "devtools-frontend" | cut -d " " -f 3 | cut -d$'\t' -f 1)

cd devtools-frontend
git fetch "$GIT_ORIGIN" HEAD

cd "$ROOT"
git reset --hard "$REMOTE_HEAD"

cd devtools-frontend
git checkout "$DEVTOOLS_SUBMODULE_COMMIT"
