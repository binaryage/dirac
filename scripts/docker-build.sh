#!/bin/bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DOCKER_TESTS_DIR"

docker build -t "dirac" "$@" .
