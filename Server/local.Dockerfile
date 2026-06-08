FROM --platform=$BUILDPLATFORM node:24 AS build

WORKDIR /usr/local/apps

COPY ./citrineos-core ./citrineos-core
RUN cd ./citrineos-core && npm install && npm run clean && npm run build

COPY ./citrineos-ocpi ./citrineos-ocpi
COPY ./citrineos-ocpi/Server/tsconfig.docker.json /usr/local/apps/citrineos-ocpi/Server/tsconfig.json

WORKDIR /usr/local/apps/citrineos-ocpi

RUN cp local-package.json package.json

RUN npm run install-all
# Diagnostics — remove after confirmed
RUN ls -la node_modules/@zetra/citrineos-base && \
    head -40 node_modules/@zetra/citrineos-base/dist/interfaces/dto/tenant.partner.dto.d.ts
RUN npm run build

FROM --platform=$BUILDPLATFORM node:24-alpine
COPY --from=build /usr/local/apps /usr/local/apps

WORKDIR /usr/local/apps/citrineos-ocpi

EXPOSE ${PORT}
CMD ["npm", "run", "start-docker"]