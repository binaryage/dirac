#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$SCRIPTS"

AGENTS_DIR=~/Library/LaunchAgents
PLIST_NAME=com.binaryage.dirac-health-check.plist
PLIST_SOURCE="plists/$PLIST_NAME"
PLIST_PATH="$AGENTS_DIR/$PLIST_NAME"

cp "$PLIST_SOURCE" "$AGENTS_DIR"
launchctl unload "$PLIST_PATH"
launchctl load -w "$PLIST_PATH"
