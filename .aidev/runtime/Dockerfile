# The image AIDEV runs this project's suites in (`environment.image` in
# .aidev/project.yaml). Suites run with `--network none`, so everything an
# install needs is in the image: Node 18.14.0 and the yarn 1 it bundles (the
# image CI's run-unit-tests/run-eslint jobs and the Dockerfile use), and a yarn
# cache filled from yarn.lock (git dependencies included). Build and pin it with
# .aidev/runtime/build.sh; see .aidev/README.md.
FROM node:18.14.0@sha256:5ab5e06df2c58dabb18b963636c2fab16b10b7150d13434a12024f599aa645bc

ENV HOME=/tmp \
    YARN_CACHE_FOLDER=/opt/yarn-cache \
    HUSKY_SKIP_INSTALL=1 \
    DISABLE_OPENCOLLECTIVE=1 \
    ADBLOCK=1 \
    CI=true

COPY package.json yarn.lock /tmp/yarn-fetch/
RUN cd /tmp/yarn-fetch \
    && yarn install --non-interactive --frozen-lockfile --ignore-optional --ignore-scripts \
    && cd / && rm -rf /tmp/yarn-fetch /tmp/.cache /tmp/.yarnrc \
    && chmod -R a+rwX /opt/yarn-cache
