#!/bin/bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DOCKER_TESTS_DIR"
"$SCRIPTS/clean-test-stage.sh" "$DIRAC_DOCKER_TEST_STAGE_DIR"

cd "$DOCKER_TESTS_DIR"

# shellcheck disable=SC2143
if [[ -n "$(docker volume ls | grep 'dirac-data-home$')" ]]; then
  docker volume rm -f "dirac-data-home"
fi

# shellcheck disable=SC2143
if [[ -n "$(docker volume ls | grep 'dirac-data-ws$')" ]]; then
  docker volume rm -f "dirac-data-ws"
fi

# shellcheck disable=SC2143
if [[ -n "$(docker volume ls | grep 'dirac-data-var-cache-apt$')" ]]; then
  docker volume rm -f "dirac-data-var-cache-apt"
fi

# shellcheck disable=SC2143
if [[ -n "$(docker images ls | grep 'dirac$')" ]]; then
  docker rmi -f "dirac"
fi
