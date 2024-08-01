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

### Version 0.2.0 (Pre-release)

#### Included Functionality

This initial release, version 0.2.0, provides partial OCPI 2.2.1 functionality. The features included are:

- **Registration**: Full Credentials & Versions implementation. Register with new eMSP partners via `CREDENTIALS_TOKEN_A` as the sender through an Admin endpoint. Create a `CREDENTIALS_TOKEN_A` through Admin endpoint. Un-register or refresh client credentials through Admin endpoints.
- **Sender Interface Endpoints**: Sessions, CDRs, Tariffs, and Locations.
- **Receiver Interface Endpoints**: Charging Profiles, Commands, and Tokens.
- **Pushes all data to MSPs**
- **Other Admin Endpoints**: Refresh Token cache from an MSP, Publish or update Locations & Tariffs

## Getting Started

To get started with CitrineOS OCPI, you will need to:

1. Clone and build the CitrineOS Core repository.
2. Clone and build the CitrineOS OCPI repository. Must have the same parent directory as CitrineOS Core.
3. Follow the instructions provided on the [Guide](https://citrineos.github.io/docs/getting-started.html) to configure and run the combined modules with OCPI activated.

## Contributing

We welcome contributions to CitrineOS OCPI. [Please refer to the contributing guidelines in the citrineos repository](https://github.com/citrineos/citrineos/blob/main/CONTRIBUTING.md) for more information on how to get involved.

## License

CitrineOS OCPI is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for more details.

---

Thank you for using CitrineOS OCPI. If you have any questions or need assistance, please feel free to [open an issue](https://github.com/citrineos/citrineos/issues) or join our [Discord](https://discord.gg/FhkRJknV3N) and ask there!

## Running database seeders:

```
npx sequelize-cli db:seed:all
```
