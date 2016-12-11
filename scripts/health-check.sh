#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

# prepare oraculum
mkdir -p "$ROOT_TMP_DIR"
ORACULUM_CHECKOUT_DIR="$ROOT_TMP_DIR/docker-chromium-oraculum"
if [[ -d "$ORACULUM_CHECKOUT_DIR" ]]; then
  pushd "$ORACULUM_CHECKOUT_DIR"
  git fetch
  git checkout master
  git reset --hard origin/master
  git clean -fd
  popd
else
  pushd "$ROOT_TMP_DIR"
  git clone https://github.com/binaryage/docker-chromium-oraculum.git
  popd
fi

# get latest chromium revision and other info
pushd "$ORACULUM_CHECKOUT_DIR"
./oraculum.sh build
CHROMIUM_REVISION=$(./oraculum.sh latest-revision)
CHROMIUM_VERSION=$(./oraculum.sh version ${CHROMIUM_REVISION})
CHROMIUM_REPO_URL=$(./oraculum.sh describe ${CHROMIUM_REVISION} redirect_url)
CHROMIUM_DOWNLOAD_URL=$(./oraculum.sh download-link ${CHROMIUM_REVISION})
popd

# checkout or create health-check branch
pushd "$ROOT"

git checkout master
git pull origin

TAG=${1:-`git describe --tags --match "v*" --abbrev=0 master`}

echo "TAG=$TAG"

set +e
git rev-parse --verify health-check
if [ $? -ne 0 ]; then
  set -e
  git checkout -b health-check "$TAG"
else
  set -e
  git checkout health-check
fi

# merge all changes from target branch
# this is needed after release to bring in new changes
git merge --no-edit -Xtheirs "$TAG"

# commit an empty commit to trigger travis build
# note that CHROMIUM_DOWNLOAD_URL will be used by travis
git commit --allow-empty -F- << EOF
check Dirac ${TAG} under ${CHROMIUM_VERSION}

CHROMIUM_REVISION=${CHROMIUM_REVISION}
CHROMIUM_REPO_URL=${CHROMIUM_REPO_URL}
CHROMIUM_DOWNLOAD_URL=${CHROMIUM_DOWNLOAD_URL}
EOF

if [[ -z "${HEALTH_CHECK_DRY_RUN}" ]]; then
  git push --force origin health-check
fi

# push return to master branch
git checkout master

popd
