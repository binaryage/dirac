# keep this in sync with travis: https://docs.travis-ci.com/user/ci-environment
FROM ubuntu:trusty

WORKDIR /root

ENV DEBIAN_FRONTEND noninteractive

# install basic deps
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get -y install software-properties-common wget curl git xvfb sudo unzip python libxss1 net-tools libgtk-3-0

# install Java 8: http://www.webupd8.org/2012/09/install-oracle-java-8-in-ubuntu-via-ppa.html
RUN add-apt-repository ppa:webupd8team/java
RUN echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | sudo /usr/bin/debconf-set-selections
RUN apt-get -y update
RUN apt-get -y install oracle-java8-installer oracle-java8-set-default
RUN java -version

# dependencies needed by chromedriver
RUN apt-get -y install libnss3 libgconf-2-4 libasound2

# install latest lein
ENV LEIN_ROOT 1
RUN cd /usr/bin \
    && wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein \
    && chmod a+x lein \
    && lein
RUN yes y | lein upgrade

VOLUME ["/root/binaryage/dirac"]
ENTRYPOINT ["/root/binaryage/dirac/scripts/docker-entrypoint.sh"]
