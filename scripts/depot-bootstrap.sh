#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

if [[ -d "$DEPOT_DIR" ]]; then
  echo "depot already exists at '$DEPOT_DIR', use depot-nuke.sh to remove it first"
  exit 1
fi

mkdir -p "$DEPOT_DIR"

cd "$DEPOT_DIR"

# this is to mimic https://github.com/ChromeDevTools/devtools-frontend#standalone-workflow
ln -s "$ROOT/resources/unpacked/devtools" "devtools-frontend"
sleep 1

# this would be output of `fetch devtools-frontend` or gclient config ...
# but we symlink devtools-frontend from dirac and fake the file
cat >.gclient <<EOF
solutions = [
  {
    "url": "https://chromium.googlesource.com/devtools/devtools-frontend.git",
    "managed": False,
    "name": "devtools-frontend",
    "deps_file": "DEPS",
    "cache_dir": "${DIRAC_CACHE_DIR}/.depot-cache-dir",
    "custom_deps": {"devtools-frontend": None}, # this should prevent gclient fetching devtools-frontend
  },
]
EOF

# do initial sync
"$SCRIPTS/depot-sync.sh"
