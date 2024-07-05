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

### Version 0.1.0 (Pre-release)

#### Included Functionality

This initial release, version 0.1.0, provides partial OCPI 2.2.1 functionality. The features included are:

- **Registration**: Register with new eMSP partners via `CREDENTIALS_TOKEN_A` as the sender through an Admin endpoint.
- **Sender Interface Endpoints**: Sessions, CDRs, Tariffs, and Locations.
- **Receiver Interface Endpoints**: Charging Profiles, Commands, and Tokens.
- **Push Logic**:
  - Fully implemented for Sessions and CDRs.
  - Partially implemented for Locations (updating EVSE and Connector objects via PATCH).

#### Missing Functionality

The following features are not included in version 0.1.0 but will be released in upcoming patch versions:

- Admin endpoints for:
  - Triggering the receiver side of registration (generating `CREDENTIALS_TOKEN_A`).
  - Refreshing credentials.
  - Un-registering credentials.
  - Creating and updating Tariffs and Locations (completing Push logic for Tariffs and Locations).
  - Refreshing Tokens cache from eMSP.
- Push logic for Charging Profiles.
- Real-time authorization logic for Sessions via Tokens.
- `next` header in paginated endpoint responses.

## Future Updates

The missing features listed above will be released in patch versions in the coming weeks. Stay tuned for updates and additional functionality as we continue to develop and improve CitrineOS OCPI.

## Getting Started

To get started with CitrineOS OCPI, you will need to:

1. Clone and build the CitrineOS Core repository.
2. Clone and build the CitrineOS OCPI repository. Must have the same parent directory as CitrineOS Core.
3. Follow the instructions provided on the ocpi setup page (TBD) to configure and run the combined modules with OCPI activated.

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
