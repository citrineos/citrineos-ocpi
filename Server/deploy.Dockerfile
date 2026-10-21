FROM --platform=$BUILDPLATFORM node:22 AS build

WORKDIR /usr/local/apps/citrineos-ocpi

COPY . .
COPY ./Server/tsconfig.docker.json /usr/local/apps/Server/tsconfig.json

ARG NPM_TAG=prod

RUN NPM_TAG=$NPM_TAG node /usr/local/apps/citrineos-ocpi/Server/scripts/rewrite-zetra-tags.ts

# node:22 bundles npm 10.9.8, which has an arborist bug that intermittently
# crashes with "Cannot read properties of null (reading 'edgesOut')" during
# peer-set resolution (fixed in npm 11.6.0, see npm/cli#9787).
RUN npm install -g npm@11.6.0

# INSTALL
RUN npm run install-all

# BUILD
RUN npm run build

# The final stage, which copies built files and prepares the run environment
# Using alpine image to reduce the final image size
FROM --platform=$BUILDPLATFORM node:22-alpine
COPY --from=build /usr/local/apps/citrineos-ocpi /usr/local/apps/citrineos-ocpi

WORKDIR /usr/local/apps/citrineos-ocpi

EXPOSE ${PORT}

CMD ["npm", "run", "start-docker-cloud"]
