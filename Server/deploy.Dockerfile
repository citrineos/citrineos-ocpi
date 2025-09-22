FROM --platform=$BUILDPLATFORM node:22 AS build

WORKDIR /usr/local/apps/citrineos-ocpi

# COPY
COPY . .

COPY ./Server/tsconfig.docker.json /usr/local/apps/Server/tsconfig.json

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
