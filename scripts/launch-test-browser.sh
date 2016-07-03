#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

if [ ! -d "$DIRAC_BROWSER_TESTS_USER_PROFILE" ] ; then
  mkdir -p "$DIRAC_BROWSER_TESTS_USER_PROFILE"
fi

EXE="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
if [ -f /usr/bin/google-chrome-unstable ] ; then
  EXE="/usr/bin/google-chrome-unstable" # this is for ubuntu
fi
if [ -n "$DIRAC_USE_CHROME" ] ; then
  EXE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
fi
if [ -n "$DIRAC_USE_CHROMIUM" ] ; then
  EXE="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi
if [ -n "$DIRAC_USE_CUSTOM_CHROME" ] ; then
  EXE="$DIRAC_USE_CUSTOM_CHROME"
fi

echo "selected browser binary '$EXE'"
echo "waiting for compilation of clojurescript components..."

# we want wait to compilation of our extensions, so that --load-extension param does not fail
# see cljsbuild-notify.sh usage in project.clj

./scripts/wait-for-notify.sh "tests"
./scripts/wait-for-notify.sh "marion-background"
./scripts/wait-for-notify.sh "marion-content-script"
./scripts/wait-for-notify.sh "dirac-implant"
./scripts/wait-for-notify.sh "dirac-background"
./scripts/wait-for-notify.sh "dirac-options"

set -x
"$EXE" \
      --remote-debugging-port=${DIRAC_CHROME_REMOTE_DEBUGGING_PORT:=9222} \
      --user-data-dir="$DIRAC_BROWSER_TESTS_USER_PROFILE" \
      --no-first-run \
      --enable-experimental-extension-apis \
      --disk-cache-dir=/dev/null \
      --media-cache-dir=/dev/null \
      --disable-hang-monitor \
      --disable-prompt-on-repost \
      --dom-automation \
      --full-memory-crash-report \
      --no-default-browser-check \
      --disable-gpu \
      --load-extension="$DEV_DIRAC_EXTENSION_PATH,$DEV_MARION_EXTENSION_PATH" \
      http://localhost:$DEV_FIXTURES_SERVER_PORT?set-agent-port=$DIRAC_AGENT_PORT 2> /dev/null
set +x

popd
