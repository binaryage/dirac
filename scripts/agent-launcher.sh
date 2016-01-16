#!/usr/bin/env bash

set -ex

DIRAC_VERSION=0.1.0
DIRAC_GROUP=binaryage
DIRAC_ARTIFACT=dirac

mvn dependency:get -DgroupId="$DIRAC_GROUP" -DartifactId="$DIRAC_ARTIFACT" -Dversion="$DIRAC_VERSION"
LOCAL_REPO=`mvn help:evaluate -Dexpression=settings.localRepository | grep -v '[INFO]'`

LOCAL_DIRAC_PATH="$LOCAL_REPO/$DIRAC_GROUP/$DIRAC_ARTIFACT/$DIRAC_VERSION"
LOCAL_DIRAC_POM_PATH="$LOCAL_DIRAC_PATH/$DIRAC_ARTIFACT-$DIRAC_VERSION.pom"
LOCAL_DIRAC_JAR_PATH="$LOCAL_DIRAC_PATH/$DIRAC_ARTIFACT-$DIRAC_VERSION.jar"

if [ ! -r "$LOCAL_DIRAC_POM_PATH" ] ; then
  echo "unexpected error: clojars' pom file does not exist '$LOCAL_DIRAC_POM_PATH'"
  exit 10
fi

# http://stackoverflow.com/a/34676160/84283
WORK_DIR=`mktemp -q -d /tmp/dirac-agent-launcher-XXXXXXX`
if [ $? -ne 0 ]; then
  echo "$0: Can't create temp file, exiting..."
  exit 1
fi

function cleanup {
  if [[ "$WORK_DIR" == /tmp/dirac-agent-launcher* ]] ; then  # this is just a paranoid test if something went terribly wrong and mktemp returned "/" or something non-tmp-ish
    rm -rf "$WORK_DIR"
    echo "Deleted temp working directory $WORK_DIR"
  else
    echo "Delete temp dir manually '$WORK_DIR'"
  fi
}
trap cleanup EXIT

# maven needs to have pom.xml for dependency:build-classpath to work, we have to read it from clojars
pushd "$WORK_DIR"
cp "$LOCAL_DIRAC_POM_PATH" pom.xml
CLASS_PATH=`mvn dependency:build-classpath | grep -v '[INFO]'`
popd

# launch the agent with full classpath
java -classpath "$CLASS_PATH:$LOCAL_DIRAC_JAR_PATH" clojure.main --main dirac.agent-cli "$@"