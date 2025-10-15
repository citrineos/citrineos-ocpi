FROM --platform=$BUILDPLATFORM node:22 AS build

WORKDIR /usr/local/apps

# copy and pack citrineos core
COPY ./citrineos-core ./citrineos-core
RUN cd ./citrineos-core && npm install && npm run build && npm pack --workspaces


COPY ./citrineos-ocpi ./citrineos-ocpi
COPY ./citrineos-ocpi/Server/tsconfig.docker.json /usr/local/apps/citrineos-ocpi/Server/tsconfig.json

WORKDIR /usr/local/apps/citrineos-ocpi

# INSTALL
RUN npm install ../citrineos-core/*.tgz
RUN npm run install-all

# BUILD
RUN npm run build

# The final stage, which copies built files and prepares the run environment
# Using alpine image to reduce the final image size
FROM --platform=$BUILDPLATFORM node:22-alpine
COPY --from=build /usr/local/apps /usr/local/apps

WORKDIR /usr/local/apps/citrineos-ocpi

EXPOSE ${PORT}

CMD ["npm", "run", "start-docker-cloud"]
