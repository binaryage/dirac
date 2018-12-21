#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DOCKER_TESTS_DIR"
  "$SCRIPTS/clean-test-stage.sh" "$DIRAC_DOCKER_TEST_STAGE_DIR"
popd

pushd "$DOCKER_TESTS_DIR"

if [[ ! -z "$(docker volume ls | grep 'dirac-data-root$')" ]]; then
  docker volume rm -f "dirac-data-root"
fi

if [[ ! -z "$(docker volume ls | grep 'dirac-data-var-cache&&pt$')" ]]; then
  docker volume rm -f "dirac-data-var-cache-apt"
fi

if [[ ! -z "$(docker images ls | grep 'dirac$')" ]]; then
  docker rmi -f "dirac"
fi

popd
