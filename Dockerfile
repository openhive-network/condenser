# CI passes --build-arg NODE_VERSION=$NODE_IMAGE_VERSION, the Node version
# common-ci-configuration defines; the major-only default is for local builds.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION} as development

WORKDIR /var/app

# Empty (the default) installs from the public registry; CI passes the on-site
# cache, as common-ci-configuration's docker_image_jobs template defines it.
ARG NPM_CONFIG_REGISTRY
ENV NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# The pnpm version package.json `packageManager` pins, installed with npm so
# that it too comes through NPM_CONFIG_REGISTRY.
RUN npm install -g "$(node -p 'require("./package.json").packageManager')" \
    && pnpm install --frozen-lockfile

COPY . .

RUN mkdir tmp && pnpm run build

CMD [ "pnpm", "run", "start" ]

### REMOVE DEV DEPENDENCIES ##
FROM development as dependencies

RUN CI=true pnpm install --frozen-lockfile --prod

### BUILD MINIFIED PRODUCTION ##
FROM node:${NODE_VERSION}-alpine as production

WORKDIR /var/app

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT ${SOURCE_COMMIT}
ARG DOCKER_TAG
ENV DOCKER_TAG ${DOCKER_TAG}
ENV NO_DEPRECATION koa

COPY --from=dependencies /var/app/package.json /var/app/package.json
COPY --from=dependencies /var/app/config /var/app/config
COPY --from=dependencies /var/app/dist /var/app/dist
COPY --from=dependencies /var/app/lib /var/app/lib
COPY --from=dependencies /var/app/src /var/app/src
COPY --from=dependencies /var/app/tmp /var/app/tmp
COPY --from=dependencies /var/app/webpack /var/app/webpack
COPY --from=dependencies /var/app/node_modules /var/app/node_modules

COPY --from=dependencies /var/app/healthcheck.js /var/app/healthcheck.js

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD node /var/app/healthcheck.js

# This stage has no pnpm; npm runs the package.json script the same way.
CMD [ "npm", "run", "production" ]
