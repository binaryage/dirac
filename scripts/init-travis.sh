#!/usr/bin/env bash

# we assume current working directory is set by our caller
# in case of travis it should be TRAVIS_BUILD_DIR
# in case of docker it should be /root

# read config
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

#export DIRAC_LOG_LEVEL=debug
export DIRAC_CHROME_DRIVER_VERBOSE=1
export LEIN_FAST_TRAMPOLINE=1

if [ ! -v TRAVIS_SKIP_LEIN_UPGRADE ]; then
  # we need lein 2.5.3+ because of https://github.com/technomancy/leiningen/issues/1762
  # update lein to latest, https://github.com/technomancy/leiningen/issues/2014#issuecomment-153829977
  set +e
  yes y | sudo lein upgrade
  set -e
fi

# install xvfb (for chrome tests)
if [ ! -v TRAVIS_SKIP_XVFB_SETUP ]; then
  export DISPLAY=:99.1
  sudo /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -screen 1 1024x768x24
fi

if [ ! -v TRAVIS_SKIP_COLORDIFF_INSTALL ]; then
  sudo apt-get install -y colordiff
fi

# install latest chromium
if cd chromium-latest-linux; then
  git pull
  cd ..
else
  git clone --depth 1 https://github.com/scheib/chromium-latest-linux.git
fi
if [ ! -v TRAVIS_SKIP_CHROMIUM_UPDATE ]; then
  ./chromium-latest-linux/update.sh
fi
export DIRAC_CHROME_BINARY_PATH=`pwd`/chromium-latest-linux/latest/chrome
export CHROME_LOG_FILE=`pwd`

# install chromedriver
if [ ! -v TRAVIS_SKIP_CHROMEDRIVER_UPDATE ]; then
  if [ -v TRAVIS_DONT_CACHE_CHROMEDRIVER -o ! -f chromedriver ]; then
    if [ -v TRAVIS_USE_CUSTOM_CHROMEDRIVER ]; then
      wget -O chromedriver.zip "$TRAVIS_USE_CUSTOM_CHROMEDRIVER" # http://x.binaryage.com/chromedriver.zip
    else
      wget -O chromedriver.zip https://chromedriver.storage.googleapis.com/2.26/chromedriver_linux64.zip
    fi
    unzip -o chromedriver.zip
  fi
  export CHROME_DRIVER_PATH=`pwd`/chromedriver
fi
