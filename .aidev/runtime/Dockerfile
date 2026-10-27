# The image AIDEV runs this project's suites in (`environment.image` in
# .aidev/project.yaml). Suites run with `--network none`, so everything an
# install needs is in the image: Node from common-ci-configuration's
# node-test-tools image (the one CI's run-unit-tests/run-eslint jobs use; this
# file pins no Node version), yarn 1, and a yarn cache filled from yarn.lock
# (git dependencies included). Build and pin it with .aidev/runtime/build.sh;
# see .aidev/README.md.
ARG BASE_IMAGE=registry.gitlab.syncad.com/hive/common-ci-configuration/node-test-tools:develop
FROM ${BASE_IMAGE}

RUN npm install -g yarn@1.22.22 && npm cache clean --force

ENV HOME=/tmp \
    YARN_CACHE_FOLDER=/opt/yarn-cache \
    HUSKY=0 \
    DISABLE_OPENCOLLECTIVE=1 \
    ADBLOCK=1 \
    CI=true

COPY package.json yarn.lock /tmp/yarn-fetch/
RUN cd /tmp/yarn-fetch \
    && yarn install --non-interactive --frozen-lockfile --ignore-optional --ignore-scripts \
    && cd / && rm -rf /tmp/yarn-fetch /tmp/.cache /tmp/.yarnrc \
    && chmod -R a+rwX /opt/yarn-cache
