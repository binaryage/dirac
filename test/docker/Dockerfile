# keep this in sync with travis: https://docs.travis-ci.com/user/ci-environment
FROM ubuntu:focal

ENV DEBIAN_FRONTEND noninteractive
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# install basic deps
RUN apt-get update && apt-get -y install --no-install-recommends \
  software-properties-common wget curl git xvfb sudo unzip python libxss1 net-tools libgtk-3-0 rsync xz-utils apt-utils

# install Java
RUN add-apt-repository ppa:openjdk-r/ppa && \
    apt-get update && \
    apt install -y --no-install-recommends \
    openjdk-15-jdk ca-certificates-java && \
    java -version

# dependencies needed by chrome/chromedriver
RUN apt-get update && apt-get -y install --no-install-recommends \
  libnss3 libgconf-2-4 libasound2 libgbm1

# install latest lein
ENV LEIN_ROOT 1
RUN cd /usr/bin && \
    wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein && \
    chmod a+x lein && \
    yes y | lein upgrade

RUN echo "docker ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

WORKDIR /dirac
VOLUME ["/dirac-ws"]
VOLUME ["/dirac"]
ENTRYPOINT ["/dirac/scripts/docker-boot.sh"]

RUN echo "\n==============\nBuild summary:" && \
    lsb_release -a && \
    echo && \
    java -version && \
    lein --version && \
    python --version && \
    echo "==============\n"
