# CitrineOS OCPI

## Table of Contents

- [Overview](#overview)
- [Module Integration](#module-integration)
- [Release Information](#release-information)
- [Getting Started](#getting-started)
- [Running database seeders](#running-database-seeders)
- [Running CORE with OCPI (NPM)](#running-core-with-ocpi-npm)
- [Running CORE with OCPI (Docker)](#running-core-with-ocpi-docker)
- [Attaching Debugger (optional)](#attaching-debugger-optional)
- [Usage](#usage)
- [Testing with EVerest](#testing-with-everest)
- [Running `clean` and `fresh`](#running-clean-and-fresh)
- [Linting and Prettier](#linting-and-prettier)
- [Contributing](#contributing)
- [License](#license)

## Overview

CitrineOS OCPI is a set of modules designed to integrate seamlessly with the CitrineOS Core repository. These modules are intended to work in conjunction with other modules that persist relevant data, rather than being spun up independently. Independent deployment of CitrineOS OCPI modules is achievable with mocks for testing purposes. Each group of combined ocpi + core/payment modules can be deployed as an independent microservice to facilitate horizontal scaling.

## Module Integration

The modules in CitrineOS OCPI integrate with modules in CitrineOS Core and CitrineOS Payment as follows:

- **Credentials and Versions** work alongside Core's Tenant module.
- **Sessions, CDRs, and Locations** work alongside Core's Transaction module.
- **Charging Profiles** work alongside Core's Smart Charging module.
- **Commands and Tokens** work alongside Core's EVDriver module.
- **Tariffs** work alongside CitrineOS Payment's Payment module.

## Release Information

### Version 2.0.0

#### Included Functionality

This release provides full OCPI 2.2.1 CPO functionality. The features included are:

- **Registration**: Full Credentials & Versions implementation. Register with new eMSP partners via `CREDENTIALS_TOKEN_A` as the sender through an Admin endpoint. Create a `CREDENTIALS_TOKEN_A` through Admin endpoint. Un-register or refresh client credentials through Admin endpoints.
- **Sender Interface Endpoints**: Sessions, CDRs, Tariffs, and Locations.
- **Receiver Interface Endpoints**: Charging Profiles, Commands, and Tokens.
- **Pushes all data to MSPs**
- **Other Admin Endpoints**: Refresh Token cache from an MSP, Publish or update Locations & Tariffs~~~~

## Getting Started

To get started with CitrineOS OCPI, you will need to:

1. Clone the CitrineOS OCPI repository.
1. `cd citrineos-ocpi/Server`
1. `docker compose build && docker compose up -d`

## Generating GraphQL Types

Before building or running the project, you must generate the GraphQL types using codegen. Run the following command from the project root:

```sh
npm run generate
```

This will use [GraphQL Code Generator](https://www.graphql-code-generator.com/) to generate the necessary TypeScript types from your GraphQL schema and documents.

## Running database seeders:

The following commands were created to initialize the DB tables:

`npm run sync-db` - ORM creates / updates DB tables to align with the models defined in the code
`npm run seed-db` - creates seed data

## Running CORE with OCPI (NPM)

You should be able to run CORE with OCPI by running `npm run start` command. This will run `nodemon` which
will watch for local file changes and rebuild and re-run the app when changes are detected. The debugger port
is also available on port `9229`.

## Running CORE with OCPI (Docker)

You should be able to run `npm run start-docker-compose` which will use the `./Server/docker-compose.yml`
configuration to `docker compose up`. This configuration will ensure that `citrineos-core` and `citrineos-ocoi`
directories are mounted ensuring the same hot code reloading capabilities. We also ensure that any locally
generated `dist`, `node_modules`, `package-lock.json`, etc. are ignored by the docker container to
prevent any conflicts.

## Attaching Debugger (optional)

Whether you run the application with Docker or locally with npm, you should be able to attach a debugger.
With debugger attached you should be able to set breakpoints in the TS code right from your IDE and debug
with ease.

### Attaching Debugger before execution using `--inspect-brk`

You can modify `nodemon.json` exec command from:

```shell
npm run build --prefix ../ && node --inspect=0.0.0.0:9229 ./dist/index.js
```

to

```shell
npm run build --prefix ../ && node --inspect-brk=0.0.0.0:9229 ./dist/index.js
```

which will wait for the debugger to attach before proceeding with execution.

## Usage

You can now connect your OCPP 2.0.1 compliant charging stations to the CitrineOS server. Make sure to configure the
charging stations to point to the server's IP address and port as specified in the config.json file.

## Testing with EVerest

This [README](./Server/everest/README.md)

## Running `clean` and `fresh`

Our current module structure consists of multiple `npm` submodules that are loaded as dependencies
running the application. This results in the need to rebuild modules that have any file changes. In
some cases, in particular when switching between branches, especially when there are changes in the
package.json, the already built `dist` as well as the already generated `package-lock.json` may
become invalid.

To alleviate the above, we created the `npm run fresh` and the `npm run clean` commands.

`npm run fresh` - will delete all `node_modules`, `dist`, `tsbuildinfo`, `package-lock.json` and clear cache
`npm run clean` - sub set of `npm run fresh` will only delete the build files `dist` and `tsbuildinfo`

## Linting and Prettier

Eslint and Prettier have been configured to help support syntactical consistency throughout the codebase.

`npm run prettier` - will run prettier and format the files
`npm run lint` - will run linter
`npm run lint-fix` - will run prettier and linter -fix flag which will attempt to resolve any linting issues.

## Contributing

We welcome contributions to CitrineOS OCPI. [Please refer to the contributing guidelines in the citrineos repository](https://github.com/citrineos/citrineos/blob/main/CONTRIBUTING.md) for more information on how to get involved.

## License

CitrineOS OCPI is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for more details.

---

Thank you for using CitrineOS OCPI. If you have any questions or need assistance, please feel free to [open an issue](https://github.com/citrineos/citrineos/issues) or join our [Discord](https://discord.gg/FhkRJknV3N) and ask there!
