#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

cd /root

#export DIRAC_LOG_LEVEL=debug
export DIRAC_CHROME_DRIVER_VERBOSE=1

if [ ! -v TRAVIS_SKIP_LEIN_UPGRADE ]; then
  # we need lein 2.5.3+ because of https://github.com/technomancy/leiningen/issues/1762
  # update lein to latest, https://github.com/technomancy/leiningen/issues/2014#issuecomment-153829977
  yes y | lein upgrade
fi

# install xvfb (for chrome tests)
if [ ! -v TRAVIS_SKIP_XVFB_SETUP ]; then
  export DISPLAY=:99.1
  /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -screen 1 1024x768x24
fi

if [ ! -v TRAVIS_SKIP_COLORDIFF_INSTALL ]; then
  apt-get install -y colordiff
fi

# install latest chromium
if cd chromium-latest-linux; then
  git pull
  cd ..
else
  git clone https://github.com/scheib/chromium-latest-linux.git
fi
if [ ! -v TRAVIS_SKIP_CHROMIUM_UPDATE ]; then
  ./chromium-latest-linux/update.sh
fi
export DIRAC_CHROME_BINARY_PATH=/root/chromium-latest-linux/latest/chrome
export CHROME_LOG_FILE=/root/

# install chromedriver
if [ ! -v TRAVIS_SKIP_CHROMEDRIVER_UPDATE ]; then
  if [ -v TRAVIS_DONT_CACHE_CHROMEDRIVER -o ! -f chromedriver ]; then
    if [ -v TRAVIS_USE_CUSTOM_CHROMEDRIVER ]; then
      wget -O chromedriver.zip "$TRAVIS_USE_CUSTOM_CHROMEDRIVER" # http://x.binaryage.com/chromedriver.zip
    else
      wget -O chromedriver.zip https://chromedriver.storage.googleapis.com/2.25/chromedriver_linux64.zip
    fi
    unzip -o chromedriver.zip
  fi
  export CHROME_DRIVER_PATH=/root/chromedriver
fi

popd
