# The image AIDEV runs this project's suites in (`environment.image` in
# .aidev/project.yaml). Suites run with `--network none`, so everything an
# install needs is in the image: Node and pnpm from common-ci-configuration's
# node-test-tools image (the one CI's run-unit-tests/run-eslint jobs use; this
# file pins no Node version), a pnpm store filled from pnpm-lock.yaml, and the
# node_modules installed from it in /opt/aidev-deps, which .aidev/pnpm-deps.sh
# seeds a worktree from: pnpm cannot install the GitHub dependency (a tarball
# without an integrity hash) from the store alone. Build and pin it with
# .aidev/runtime/build.sh; see .aidev/README.md.
ARG BASE_IMAGE=registry.gitlab.syncad.com/hive/common-ci-configuration/node-test-tools:develop
FROM ${BASE_IMAGE}

# Empty installs from the public registry; build.sh passes the caller's value.
ARG NPM_CONFIG_REGISTRY

ENV HOME=/tmp \
    npm_config_store_dir=/opt/pnpm-store \
    HUSKY=0 \
    DISABLE_OPENCOLLECTIVE=1 \
    ADBLOCK=1 \
    CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /opt/aidev-deps/
# pnpm clones a git dependency not hosted on GitHub on every install: mirror
# those into the image and point git at the mirrors.
RUN cd /opt/aidev-deps \
    && grep -o 'repo: https://[^,}]*, type: git' pnpm-lock.yaml | sed 's/^repo: //; s/, type: git$//' | sort -u \
        | while read -r url; do \
            path="${url#https://}" host="${path%%/*}" \
            && git clone --quiet --mirror "$url" "/opt/git-mirrors/$path" \
            && git config --system url."file:///opt/git-mirrors/$host/".insteadOf "https://$host/" || exit 1; \
        done \
    && git config --system --add safe.directory '*' \
    && pnpm install --frozen-lockfile --ignore-scripts \
    && rm -rf /tmp/.cache \
    && chmod -R a+rwX /opt/pnpm-store
