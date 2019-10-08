#!/bin/bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

"$SCRIPTS/sync-test-stage.sh" "$DIRAC_DOCKER_TEST_STAGE_DIR"

cd "$DOCKER_TESTS_DIR"

docker volume create --name "dirac-data-root" > /dev/null
docker volume create --name "dirac-data-var-cache-apt" > /dev/null

# for dns see https://forums.docker.com/t/intermittent-dns-resolving-issues/9584/17?u=drwin
docker run \
  --name "dirac-job" \
  --dns=8.8.8.8 \
  -v "dirac-data-root:/root" \
  -v "dirac-data-var-cache-apt:/var/cache/apt" \
  -v "$DIRAC_DOCKER_TEST_STAGE_DIR:/root/binaryage/dirac" \
  --rm \
  -it dirac \
  "$@"
