#!/usr/bin/env bash

# we assume current working directory is set by our caller
# it should be a checkout of dirac repo (TRAVIS_BUILD_DIR)

# read config
set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

#export DIRAC_LOG_LEVEL=debug
export DIRAC_CHROME_DRIVER_VERBOSE=1

if [[ -z "${TRAVIS_SKIP_DEPOT_TOOLS_INSTALL}" ]]; then
  # see https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up
  if [[ -d depot_tools ]]; then
    cd depot_tools
    git pull origin
    cd ..
  else
    git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git
  fi
  DEPOT_TOOLS_PATH="$(pwd -P)/depot_tools"
  export PATH=$DEPOT_TOOLS_PATH:$PATH
  gclient --version
fi

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

if [[ -z "${TRAVIS_SKIP_ADDITIONAL_DEPS_INSTALL}" ]]; then
  sudo apt-get install -y rsync xz-utils
fi

# install latest chromium
pushd "$TRAVIS_BUILD_DIR"

if [[ -z "${TRAVIS_SKIP_DEPOT_BOOTSTRAP}" ]]; then
  if [[ ! -d "$DEPOT_DIR" ]]; then
    "$SCRIPTS/depot-bootstrap.sh"
  fi
fi

# HACK: we rely on the fact that the tmp dir is mapped to host and persists
mkdir -p "$ROOT_TMP_DIR_RELATIVE"
cd "$ROOT_TMP_DIR_RELATIVE"

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
    CHROMIUM_LASTCHANGE_URL="https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2FLAST_CHANGE?alt=media"
    CHROMIUM_REVISION=$(curl -s -S "$CHROMIUM_LASTCHANGE_URL")
    CHROMIUM_DOWNLOAD_URL="https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F$CHROMIUM_REVISION%2Fchrome-linux.zip?alt=media"
    echo "latest Chromium revision is $CHROMIUM_REVISION"
    if [[ -d ${CHROMIUM_REVISION} ]] ; then
      echo "... already have downloaded that version"
    else
      ZIP_FILE="${CHROMIUM_REVISION}-chrome-linux.zip"
      echo "fetching $CHROMIUM_DOWNLOAD_URL"
      rm -rf "$CHROMIUM_REVISION"
      mkdir "$CHROMIUM_REVISION"
      pushd "$CHROMIUM_REVISION"
      curl -s "$CHROMIUM_DOWNLOAD_URL" > "$ZIP_FILE"
      unzip -q "$ZIP_FILE"
      popd
    fi
    export DIRAC_CHROME_BINARY_PATH="`pwd`/${CHROMIUM_REVISION}/chrome-linux/chrome"
  fi
else
  export DIRAC_CHROME_BINARY_PATH=`which chrome`
fi

echo "Chrome binary is located at '$DIRAC_CHROME_BINARY_PATH'"

# install chromedriver
if [[ -z "${TRAVIS_SKIP_CHROMEDRIVER_UPDATE}" ]]; then
  if [[ ! -z "${TRAVIS_USE_CUSTOM_CHROMEDRIVER}" ]]; then
    CHROMEDRIVER_SLUG="chromedriver-custom"
    curl -s "${TRAVIS_USE_CUSTOM_CHROMEDRIVER}" > "${CHROMEDRIVER_SLUG}.zip" # http://x.binaryage.com/chromedriver.zip
    rm -rf "${CHROMEDRIVER_SLUG}"
    unzip -q -j -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
  else
    if [[ "${TRAVIS_CHROMEDRIVER_VERSION}" == "VIA_CHROMIUM_DOWNLOAD_URL" ]]; then
      echo "CHROMIUM_DOWNLOAD_URL is $CHROMIUM_DOWNLOAD_URL"
      CHROMEDRIVER_DOWNLOAD_URL=${CHROMIUM_DOWNLOAD_URL/chrome-linux/chromedriver_linux64}
      echo "CHROMEDRIVER_DOWNLOAD_URL is $CHROMEDRIVER_DOWNLOAD_URL"
      CHROMEDRIVER_SLUG="chromedriver-via-chromium-download-url"
      curl -s "$CHROMEDRIVER_DOWNLOAD_URL" > "${CHROMEDRIVER_SLUG}.zip"
      rm -rf "${CHROMEDRIVER_SLUG}"
      unzip -q -j -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
    elif  [[ "${TRAVIS_CHROMEDRIVER_VERSION}" == "LATEST"* ]]; then
      LATEST_VERSION=`curl -L "https://chromedriver.storage.googleapis.com/${TRAVIS_CHROMEDRIVER_VERSION}"`
      CHROMEDRIVER_SLUG="chromedriver-latest"
      curl -s "https://chromedriver.storage.googleapis.com/${LATEST_VERSION}/chromedriver_linux64.zip" > "${CHROMEDRIVER_SLUG}.zip"
      rm -rf "${CHROMEDRIVER_SLUG}"
      unzip -q -j -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
    else
      CHROMEDRIVER_SLUG="chromedriver-${TRAVIS_CHROMEDRIVER_VERSION}"
      if [[ ! -z "${TRAVIS_DONT_CACHE_CHROMEDRIVER}" || ! -f "${CHROMEDRIVER_SLUG}" ]]; then
        curl -s "https://chromedriver.storage.googleapis.com/${TRAVIS_CHROMEDRIVER_VERSION}/chromedriver_linux64.zip" > "${CHROMEDRIVER_SLUG}.zip"
        rm -rf "${CHROMEDRIVER_SLUG}"
        unzip -q -j -o "${CHROMEDRIVER_SLUG}.zip" -d "${CHROMEDRIVER_SLUG}"
      fi
    fi
  fi
fi
export CHROME_DRIVER_PATH="`pwd`/${CHROMEDRIVER_SLUG}/chromedriver"
echo "ChromeDriver binary is located at '$CHROME_DRIVER_PATH'"

popd # "$TRAVIS_BUILD_DIR"

"$DIRAC_CHROME_BINARY_PATH" --version
"$CHROME_DRIVER_PATH" --version
