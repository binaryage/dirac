#!/bin/bash

# this is the entry-point of travis build job, see .travis.yml

set -e

init_travis_env() {
  #export CHROME_DRIVER_PATH=/root/build/chromedriver
  #export DIRAC_CHROME_BINARY_PATH=/root/build/chromium-latest-linux/latest/chrome
  #export DIRAC_CHROME_DRIVER_BROWSER_LOG_LEVEL= # https://bugs.chromium.org/p/chromedriver/issues/detail?id=817#c35
  #export TRAVIS_SKIP_CHROMIUM_UPDATE=1
  #export TRAVIS_DONT_CACHE_CHROMEDRIVER=1
  #export TRAVIS_USE_CUSTOM_CHROMEDRIVER=http://x.binaryage.com/chromedriver.zip

  echo "====================================================================================================================="
  set -x
  source "./scripts/init-travis.sh"
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

if [ -z "$1" -o "$1" = "test" ]; then
  init_travis_env
  print_env
  echo_cmd ./scripts/test-all.sh
  result=$?
  exit ${result}
fi

if [ "$1" = "test-browser" ]; then
  init_travis_env
  print_env
  echo_cmd ./scripts/test-browser.sh
  result=$?
  exit ${result}
fi

echo "(exec raw command) $ $@"
exec "$@"
