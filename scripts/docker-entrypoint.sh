#!/bin/bash

# this is the entry-point of our docker container, see test/docker/Dockerfile

set -e

TRAVIS_BUILD_DIR=/root/binaryage/dirac

init_travis_env() {
  export TRAVIS=1

  #export CHROME_DRIVER_PATH=/root/build/chromedriver
  #export DIRAC_CHROME_BINARY_PATH=/root/build/chromium-latest-linux/latest/chrome
  #export DIRAC_CHROME_DRIVER_BROWSER_LOG_LEVEL= # https://bugs.chromium.org/p/chromedriver/issues/detail?id=817#c35
  #export TRAVIS_SKIP_CHROMIUM_UPDATE=1
  #export TRAVIS_DONT_CACHE_CHROMEDRIVER=1
  #export TRAVIS_USE_CUSTOM_CHROMEDRIVER=https://storage.googleapis.com/chromedriver-data/continuous/chromedriver_linux64_2.34.527066.zip

  echo "====================================================================================================================="
  set -x
  pushd /root
  source "$TRAVIS_BUILD_DIR/scripts/init-travis.sh"
  popd
  set +x
  echo "====================================================================================================================="
}

print_env() {
  echo
  echo "--- EFFECTIVE ENVIRONMENT ---"
  env
  echo "-----------------------------"
}

echo_cmd() {
  echo "(in $(pwd)) $ $@"
  "$@"
}

# ---------------------------------------------------------------------------------------------------------------------------

if [[ "$1" = "prime" ]]; then
  pushd "$TRAVIS_BUILD_DIR"
  export SKIP_DIRAC_TESTS=1
  init_travis_env
  print_env
  popd
  exit 0
fi

if [[ "$1" = "test" ]]; then
  pushd "$TRAVIS_BUILD_DIR"
  init_travis_env
  print_env
  shift
  echo_cmd ./scripts/test-all.sh "$@"
  result=$?
  popd
  exit ${result}
fi

if [[ "$1" = "test-browser" ]]; then
  pushd "$TRAVIS_BUILD_DIR"
  init_travis_env
  print_env
  shift
  echo_cmd ./scripts/test-browser.sh "$@"
  result=$?
  popd
  exit ${result}
fi

if [[ $# -eq 0 ]]; then
  echo "no arguments provided"
  echo "please provide a command to run in dirac directory, e.g."
  echo "  launch './scripts/run-docker.sh test'"
  echo "  launch './scripts/run-docker.sh test-browser'"
  echo "  launch './scripts/run-docker.sh bash'"
  exit 1
else
  cd "$TRAVIS_BUILD_DIR"
  echo "(in $(pwd)) [exec raw command] $ $@"
  exec "$@"
fi
