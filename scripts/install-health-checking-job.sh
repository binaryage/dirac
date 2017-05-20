#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$SCRIPTS"

AGENTS_DIR=~/Library/LaunchAgents
PLIST_NAME=com.binaryage.dirac-health-check.plist
PLIST_SOURCE="plists/$PLIST_NAME"
PLIST_PATH="$AGENTS_DIR/$PLIST_NAME"

cp "$PLIST_SOURCE" "$AGENTS_DIR"
launchctl unload "$PLIST_PATH"
launchctl load -w "$PLIST_PATH"

popd
