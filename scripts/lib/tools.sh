#!/usr/bin/env bash

redirect_to_test_stage_if_needed() {
  if [[ -n "$DIRAC_TEST_IN_STAGE" ]]; then
    local spawn_script_path
    spawn_script_path=$(portable_realpath "$SPAWN_COMMAND")
    local script_path
    script_path=$(portable_realpath --relative-to="$ROOT" "$spawn_script_path")
    "$SCRIPTS/sync-test-stage.sh"
    cd "$DIRAC_TEST_STAGE_DIR"
    unset DIRAC_TEST_IN_STAGE
    export DIRAC_WORKSPACE_DIR="$DIRAC_WORKSPACE_DIR"
    exec "$script_path" "$@"
  fi
}
