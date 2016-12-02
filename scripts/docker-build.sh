#!/bin/bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DOCKER_TESTS_DIR"

docker build -t "dirac" .

popd

popd
