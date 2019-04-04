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

if [[ -z "${TRAVIS_SKIP_NSS3_UPGRADE}" ]]; then
  # this is needed for recent chrome
  # they require patched version of this lib or refuse to run:
  #   FATAL:nss_util.cc(679)] NSS_VersionCheck("3.26") failed. NSS >= 3.26 is required. Please upgrade to the latest NSS, and if you still get this error, contact your distribution maintainer.
  #
  # see failure: https://travis-ci.org/binaryage/dirac/builds/241581291#L946
  sudo apt-get install -y --reinstall libnss3
fi

if [[ -z "${TRAVIS_SKIP_LEIN_UPGRADE}" ]]; then
  # we need lein 2.5.3+ because of https://github.com/technomancy/leiningen/issues/1762
  # update lein to latest, https://github.com/technomancy/leiningen/issues/2014#issuecomment-153829977
  yes y | sudo lein upgrade || true # note: sudo lein upgrade exits with non-zero exit code if there is nothing to be updated
fi

# install xvfb (for chrome tests)
if [[ -z "${TRAVIS_SKIP_XVFB_SETUP}" ]]; then
  export DISPLAY=:99
  sudo /sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -ac -screen 0 1024x768x24 -nolisten tcp
fi

if [[ -z "${TRAVIS_SKIP_COLORDIFF_INSTALL}" ]]; then
  sudo apt-get install -y colordiff
fi

# install latest chromium
pushd "$TRAVIS_BUILD_DIR"
if [[ -z "${TRAVIS_SKIP_CHROMIUM_SETUP}" ]]; then
  if [[ -z "$TRAVIS_COMMIT" ]]; then
    TRAVIS_COMMIT="HEAD"
  fi
  # check for presence of CHROMIUM_DOWNLOAD_URL in the commit message
  CHROMIUM_DOWNLOAD_URL=$(git show -s --format=%B "${TRAVIS_COMMIT}" | grep "CHROMIUM_DOWNLOAD_URL=" | cut -d= -f2-) || true
  if [[ ! -z "$CHROMIUM_DOWNLOAD_URL" ]]; then
    # CHROMIUM_DOWNLOAD_URL present
    ZIP_FILE="snapshot.zip"
    curl -s "$CHROMIUM_DOWNLOAD_URL" > "$ZIP_FILE"
    if [[ ! -f "$ZIP_FILE" ]]; then
      echo "failed to download Chromium snapshot from $CHROMIUM_DOWNLOAD_URL"
      exit 31
    fi
    if grep -q "Not Found" "$ZIP_FILE"; then
      echo "Chromium snapshot $CHROMIUM_DOWNLOAD_URL not found in $ZIP_FILE"
      exit 30
    fi
    rm -rf "chrome-linux/"
    unzip "$ZIP_FILE"
    export DIRAC_CHROME_BINARY_PATH=`pwd`/chrome-linux/chrome
  fi

  # CHROMIUM_DOWNLOAD_URL not present => use the latest
  if [[ -z "$DIRAC_CHROME_BINARY_PATH" ]]; then
    if cd chromium-latest-linux; then
      git pull
      cd ..
    else
      git clone --depth 1 https://github.com/scheib/chromium-latest-linux.git
    fi
    if [[ -z "${TRAVIS_SKIP_CHROMIUM_UPDATE}" ]]; then
      ./chromium-latest-linux/update.sh
    fi
    export DIRAC_CHROME_BINARY_PATH=`pwd`/chromium-latest-linux/latest/chrome
  fi
else
  export DIRAC_CHROME_BINARY_PATH=`which chrome`
fi
popd

# install chromedriver
if [[ -z "${TRAVIS_SKIP_CHROMEDRIVER_UPDATE}" ]]; then
  if [[ ! -z "${TRAVIS_USE_CUSTOM_CHROMEDRIVER}" ]]; then
    CHROMEDRIVER_SLUG="chromedriver-custom"
    wget -O "${CHROMEDRIVER_SLUG}.zip" "${TRAVIS_USE_CUSTOM_CHROMEDRIVER}" # http://x.binaryage.com/chromedriver.zip
    rm -rf "${CHROMEDRIVER_SLUG}"
    unzip -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
  else
    if [[ "${TRAVIS_CHROMEDRIVER_VERSION}" == "LATEST"* ]]; then
      LATEST_VERSION=`curl -L "https://chromedriver.storage.googleapis.com/${TRAVIS_CHROMEDRIVER_VERSION}"`
      CHROMEDRIVER_SLUG="chromedriver-latest"
      wget -O "${CHROMEDRIVER_SLUG}.zip" "https://chromedriver.storage.googleapis.com/${LATEST_VERSION}/chromedriver_linux64.zip"
      rm -rf "${CHROMEDRIVER_SLUG}"
      unzip -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
    else
      CHROMEDRIVER_SLUG="chromedriver-${TRAVIS_CHROMEDRIVER_VERSION}"
      if [[ ! -z "${TRAVIS_DONT_CACHE_CHROMEDRIVER}" || ! -f "${CHROMEDRIVER_SLUG}" ]]; then
        wget -O "${CHROMEDRIVER_SLUG}.zip" "https://chromedriver.storage.googleapis.com/${TRAVIS_CHROMEDRIVER_VERSION}/chromedriver_linux64.zip"
        rm -rf "${CHROMEDRIVER_SLUG}"
        unzip -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
      fi
    fi
  fi
  rm -rf chromedriver
  cp "${CHROMEDRIVER_SLUG}/chromedriver" chromedriver
fi
export CHROME_DRIVER_PATH=`pwd`/chromedriver

${CHROME_DRIVER_PATH} --version
