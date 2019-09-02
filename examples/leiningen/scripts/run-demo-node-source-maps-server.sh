#!/usr/bin/env bash

set -e

cd "$(dirname "${BASH_SOURCE[0]}")"; cd ..

ROOT=`pwd`
SERVER_ROOT="$ROOT/resources/demo-node"
SERVER_PORT=9988

pushd "$SERVER_ROOT" > /dev/null

set +e
PYTHON_PATH=`which python`
set -e
if [ -z "$PYTHON_PATH" ]; then
  echo "Error: python does not seem to be installed on your PATH. We use python to start a simple HTTP server."
  exit 3
else
  echo "Starting HTTP server on port $SERVER_PORT => http://localhost:$SERVER_PORT"
fi

python -m SimpleHTTPServer "$SERVER_PORT" 2> /dev/null \
  || echo "Error: failed to start 'python -m SimpleHTTPServer ...', do you have python properly installed? isn't the port $SERVER_PORT already used?"

popd
