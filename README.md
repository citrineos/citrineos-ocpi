# CitrineOS OCPI

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

### Version 1.0.0

#### Included Functionality

This release provides full OCPI 2.2.1 CPO functionality. The features included are:

- **Registration**: Full Credentials & Versions implementation. Register with new eMSP partners via `CREDENTIALS_TOKEN_A` as the sender through an Admin endpoint. Create a `CREDENTIALS_TOKEN_A` through Admin endpoint. Un-register or refresh client credentials through Admin endpoints.
- **Sender Interface Endpoints**: Sessions, CDRs, Tariffs, and Locations.
- **Receiver Interface Endpoints**: Charging Profiles, Commands, and Tokens.
- **Pushes all data to MSPs**
- **Other Admin Endpoints**: Refresh Token cache from an MSP, Publish or update Locations & Tariffs

## Getting Started
OCPI cannot be ran alone. To run OCPI, you must extend the `/Server` configuration included in
[CORE](https://github.com/citrineos/citrineos-core) to also initialize OCPI components. For this purpose,
we have created a [DEMO](https://github.com/citrineos/citrineos-demo) repo where we have an example `/Server`
setup that runs `CORE` together with `OCPI`.

You should still be able to `npm run lint/test/prettier` here.

## Running database seeders:
The following commands were created to initialize the DB tables:

`npm run sync-db` - ORM creates / updates DB tables to align with the models defined in the code
`npm run seed-db` - creates seed data

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
