# CitrineOS OCPI

## Table of Contents

- [Overview](#overview)
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

CitrineOS OCPI is a set of modules designed to integrate seamlessly with the CitrineOS Core repository. These modules use CitrineOS Core's GraphQL API for data access and manipulation, and integrate with the PostgresQL database for LISTEN/NOTIFY events in order to trigger push updates.

## Release Information

### Version 2.0.0

#### Included Functionality

This release provides full OCPI 2.2.1 CPO functionality. The features included are:

- **Registration**: Full Credentials & Versions implementation. Register with new eMSP partners via `CREDENTIALS_TOKEN_A` as the sender through an Admin endpoint. Create a `CREDENTIALS_TOKEN_A` through Admin endpoint. Un-register or refresh client credentials through Admin endpoints.
- **Sender Interface Endpoints**: Sessions, CDRs, Tariffs, and Locations.
- **Receiver Interface Endpoints**: Commands, and Tokens.
- **Pushes all data to MSPs**

## Getting Started

To get started with CitrineOS OCPI, you will need to:

1. Clone the CitrineOS OCPI repository.
1. `cd citrineos-ocpi/Server`
1. `docker compose build && docker compose up -d`

If working with a local version of CitrineOS Core, such as a release candidate branch, make sure it is in the same parent folder as `citrineos-ocpi`, then use the following command instead:

1. `docker compose -f docker-compose-local.yml build && docker compose -f docker-compose-local.yml up -d`

## Generating GraphQL Types

You can generate the GraphQL types using codegen, and should do so after making any changes to your GraphQL schema or queries in 00_Base/src/graphql/queries. Run the following command from the project root:

```sh
npm run generate
```

This will use [GraphQL Code Generator](https://www.graphql-code-generator.com/) to generate the necessary TypeScript types from your GraphQL schema and documents.

## Running database seeders:

The following command was created to initialize the DB tables:

`npm run seed-db` - creates seed data: a default tenant and a default tenant partner, to act as an eMSP.

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

You can now connect your OCPP compliant charging stations to the CitrineOS server. Make sure to configure the
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
