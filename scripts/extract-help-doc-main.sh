#!/usr/bin/env bash

# this script tries to launch dirac.main via lein
#
# usage ./main.sh [args]
#

set -e

# https://stackoverflow.com/a/17841619/84283
join_by() {
 local IFS="$1"
 shift
 echo "$*"
}

start_pre_block() {
  echo "\`\`\`"
}

end_pre_block() {
  echo "\`\`\`"
}

emit_help_markdown() {
  local line
  # shellcheck disable=SC2068
  line="$(join_by " " ${@/eval/})"
  echo ""
  echo "##### \`> dirac $line\`"
  start_pre_block
  lein run -m dirac.main -- "$@"
  end_pre_block
}

generate_readme() {
  emit_help_markdown help
  emit_help_markdown help launch
  emit_help_markdown help nuke
}

cd "$ROOT"
generate_readme
