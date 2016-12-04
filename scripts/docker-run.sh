#!/bin/bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DOCKER_TESTS_DIR"

docker volume create --name "dirac-data-root"
docker volume create --name "dirac-data-var-cache-apt"

# for shm-size, see https://bugs.chromium.org/p/chromedriver/issues/detail?id=732#c31
# for dns see https://forums.docker.com/t/intermittent-dns-resolving-issues/9584/17?u=drwin

#  --net=host \

docker run \
  --name "dirac-job" \
  --dns=8.8.8.8 \
  --privileged \
  --shm-size=1g \
  -v "dirac-data-root:/root" \
  -v "dirac-data-var-cache-apt:/var/cache/apt" \
  -v "$ROOT:/root/binaryage/dirac" \
  -e JAVA_OPTS='-Xmx1g' \
  --rm \
  -it dirac \
  "$@"

popd
