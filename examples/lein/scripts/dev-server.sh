#!/usr/bin/env bash

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"; cd ..

ROOT=`pwd`
DEVSERVER_ROOT="$ROOT/resources/public"
DEVSERVER_PORT=9977

cd "$DEVSERVER_ROOT"

set +e
PYTHON_PATH=`which python`
set -e
if [ -z "$PYTHON_PATH" ]; then
  echo "Error: python does not seem to be installed on your PATH. We use python to start a simple HTTP server."
  exit 3
else
  echo "Starting HTTP server on port $DEVSERVER_PORT => http://localhost:$DEVSERVER_PORT"
fi

# taken from https://stackoverflow.com/a/52967771/84283
VERSION=$(python -V 2>&1 | cut -d\  -f 2) # python 2 prints version to stderr
VERSION=(${VERSION//./ }) # make an version parts array
if [[ ${VERSION[0]} -lt 3 ]]; then
    LAUNCH_SERVER_CMD="python -m SimpleHTTPServer"
else
    LAUNCH_SERVER_CMD="python -m http.server"
fi

${LAUNCH_SERVER_CMD} "$DEVSERVER_PORT" 2> /dev/null \
  || echo "Error: failed to start '${LAUNCH_SERVER_CMD} ...', do you have python properly installed? isn't the port $DEVSERVER_PORT already used?"
