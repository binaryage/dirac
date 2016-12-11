#!/bin/bash

# this is the entry-point of travis build job, see .travis.yml

set -e

#export CHROME_DRIVER_PATH=/root/build/chromedriver
#export DIRAC_CHROME_BINARY_PATH=/root/build/chromium-latest-linux/latest/chrome
#export DIRAC_CHROME_DRIVER_BROWSER_LOG_LEVEL= # https://bugs.chromium.org/p/chromedriver/issues/detail?id=817#c35
#export TRAVIS_SKIP_CHROMIUM_UPDATE=1
#export TRAVIS_DONT_CACHE_CHROMEDRIVER=1
#export TRAVIS_USE_CUSTOM_CHROMEDRIVER=http://x.binaryage.com/chromedriver.zip

init_travis_env() {
  source "./scripts/lib/travis.sh"
  travis_fold start init-travis
  set -x
  source "./scripts/init-travis.sh"
  set +x
  travis_fold end init-travis
}

# ---------------------------------------------------------------------------------------------------------------------------

if [ -z "$1" -o "$1" = "test" ]; then
  init_travis_env
  travis_cmd ./scripts/test-all.sh
  result=$?
  exit ${result}
fi

if [ "$1" = "test-browser" ]; then
  init_travis_env
  travis_cmd ./scripts/test-browser.sh
  result=$?
  exit ${result}
fi

echo "(exec raw command) $ $@"
exec "$@"
