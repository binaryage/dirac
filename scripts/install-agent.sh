#!/usr/bin/env bash

AGENTS_DIR=~/Library/LaunchAgents
PLIST_NAME=com.binaryage.dirac.plist
PLIST_PATH="$AGENTS_DIR/$PLIST_NAME"

cp "$PLIST_NAME" "$AGENTS_DIR"
launchctl unload "$PLIST_PATH"
launchctl load -w "$PLIST_PATH"