# The image AIDEV runs this project's suites in (`environment.image` in
# .aidev/project.yaml). Suites run with `--network none`, so everything an
# install needs is in the image: Node 24.21.0 and the yarn 1 it bundles (the
# image CI's run-unit-tests/run-eslint jobs and the Dockerfile use), and a yarn
# cache filled from yarn.lock (git dependencies included). Build and pin it with
# .aidev/runtime/build.sh; see .aidev/README.md.
FROM node:24.21.0@sha256:64af3819f9275802414d7cdc38c27e9d82bd564dec4d4da87d008255d36c63b4

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
