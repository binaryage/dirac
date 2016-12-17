#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

# taken from git/contrib/subtree
find_latest_squash(){
  set +e
  dir="$1"
  sq=
  main=
  sub=
  git log --grep="^git-subtree-dir:" --pretty=format:'START %H%n%s%n%n%b%nEND%n' |
  while read a b junk; do
    case "$a" in
      START) sq="$b" ;;
      git-subtree-mainline:) main="$b" ;;
      git-subtree-split:) sub="$b" ;;
      END)
        if [ -n "$sub" ]; then
          if [ -n "$main" ]; then
            # a rejoin commit?
            # Pretend its sub was a squash.
            sq="$sub"
          fi
          echo "$sq" "$sub"
          break
        fi
        sq=
        main=
        sub=
        ;;
    esac
  done
  set -e
}

# http://stackoverflow.com/a/3232082/84283
confirm () {
  # call with a prompt string or use a default
  read -r -p "${1:-Are you sure? [y/N]} " response
  case ${response} in
    [yY][eE][sS]|[yY])
        true
        ;;
    *)
        false
        ;;
  esac
}

SHA=${1:-HEAD}
FORCE_PUSH=$2

if [ -d "$DIFF_WORK_DIR" ] ; then
  rm -rf "$DIFF_WORK_DIR"
fi

mkdir -p "$DIFF_WORK_DIR"

pushd "$DIFF_WORK_DIR"
OURS="$DIFF_WORK_DIR/ours"
git clone "$ROOT" "$OURS"
popd

pushd "$OURS"
git checkout "$SHA"
FULL_SHA=$(git rev-parse HEAD)
first_split="$(find_latest_squash "$OURS")"
set ${first_split}
SQUASH_COMMIT_SHA=$1
LAST_MERGED_DEVTOOLS_SHA=$2
if [ -z "$LAST_MERGED_DEVTOOLS_SHA" ]; then
  echo "Can't find last squash-merge in '$OURS'."
  exit 2
fi
popd

pushd "$DIFF_WORK_DIR"
THEIRS="$DIFF_WORK_DIR/theirs"
git clone "$ROOT" "$THEIRS" --branch "$DEVTOOLS_BRANCH"
popd

pushd "$THEIRS"
git checkout -b "$DIFF_BRANCH"
git reset --hard "$LAST_MERGED_DEVTOOLS_SHA"
git rm -rf *
cp -R "$OURS/$DEVTOOLS_DIRAC_PREFIX"/* .
git add -A
git commit -m "devtools -> dirac as of $FULL_SHA"

if [[ ! -z "$FORCE_PUSH" ]] || confirm "Do you want to force push new $DIFF_BRANCH of github's Dirac repo? [y/N]" ; then
  git push -f git@github.com:binaryage/dirac.git "$DIFF_BRANCH"
fi

popd
