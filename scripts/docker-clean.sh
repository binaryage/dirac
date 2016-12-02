#!/bin/bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

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

popd
