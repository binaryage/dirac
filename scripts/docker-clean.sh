#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DOCKER_TESTS_DIR"

if [ ! -z "$(docker volumes ls | grep 'dirac-data-root$')" ]; then
  docker volumes rm "dirac-data-root"
fi

if [ ! -z "$(docker volumes ls | grep 'dirac-data-var-cache-apt$')" ]; then
  docker volumes rm "dirac-data-var-cache-apt"
fi

if [ ! -z "$(docker images ls | grep 'dirac$')" ]; then
  docker rmi "dirac"
fi

popd
