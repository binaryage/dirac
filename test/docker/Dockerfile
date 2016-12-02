FROM ubuntu:latest

WORKDIR /root

# install basic deps
RUN apt-get update
RUN apt-get install -y default-jre wget curl git xvfb sudo openjdk-8-jdk unzip python libxss1 net-tools

# install lein
ENV LEIN_ROOT 1
RUN cd /usr/bin \
    && wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein \
    && chmod a+x lein \
    && lein
RUN yes y | lein upgrade

VOLUME ["/root/binaryage/dirac"]
ENTRYPOINT ["/root/binaryage/dirac/scripts/docker-entrypoint.sh"]
CMD ["./scripts/test-all-here"]
