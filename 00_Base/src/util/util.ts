import {ICredentialsRole} from "../model/CredentialsRole";
import {Role} from "../model/Role";
import {plainToInstance} from "class-transformer";
import {ClientInformation} from "../model/client.information";

export type Constructor<T = unknown> = new (...args: any[]) => T;

export const invalidClientCredentialsRoles = (roles: ICredentialsRole[]) => roles.some(role => role.role !== Role.EMSP);
export const invalidServerCredentialsRoles = (roles: ICredentialsRole[]) => roles.some(role => role.role !== Role.CPO);

export enum CountryCode {
  US = 'US',
  CA = 'CA',
  MX = 'MX'
}

export const plainToClass = <T>(constructor: Constructor<T>, plain: T): T => {
  const x = {
    "id": 2,
    "clientToken": "123",
    "serverToken": "123",
    "registered": false,
    "cpoTenantId": 2,
    "createdAt": "2024-06-10T21:02:32.971Z",
    "updatedAt": "2024-06-10T21:02:32.971Z",
    "clientVersionDetails": [
      {
        "id": 2,
        "version": "2.2.1",
        "url": "https://localhost:8086",
        "clientInformationId": 2,
        "createdAt": "2024-06-10T21:02:32.989Z",
        "updatedAt": "2024-06-10T21:02:32.989Z",
        "endpoints": [
          {
            "id": 19,
            "identifier": "credentials",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/credentials/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.011Z",
            "updatedAt": "2024-06-10T21:02:33.011Z"
          },
          {
            "id": 20,
            "identifier": "versions",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/versions/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.033Z",
            "updatedAt": "2024-06-10T21:02:33.033Z"
          },
          {
            "id": 21,
            "identifier": "cdrs",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/cdrs/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.051Z",
            "updatedAt": "2024-06-10T21:02:33.051Z"
          },
          {
            "id": 22,
            "identifier": "chargingprofiles",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/chargingprofiles/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.071Z",
            "updatedAt": "2024-06-10T21:02:33.071Z"
          },
          {
            "id": 23,
            "identifier": "commands",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/commands/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.089Z",
            "updatedAt": "2024-06-10T21:02:33.089Z"
          },
          {
            "id": 24,
            "identifier": "locations",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/locations/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.100Z",
            "updatedAt": "2024-06-10T21:02:33.100Z"
          },
          {
            "id": 25,
            "identifier": "sessions",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/sessions/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.105Z",
            "updatedAt": "2024-06-10T21:02:33.105Z"
          },
          {
            "id": 26,
            "identifier": "tariffs",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/tariffs/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.121Z",
            "updatedAt": "2024-06-10T21:02:33.121Z"
          },
          {
            "id": 27,
            "identifier": "tokens",
            "role": "RECEIVER",
            "url": "https://localhost:8086/ocpi/tokens/",
            "clientVersionId": 2,
            "serverVersionId": null,
            "createdAt": "2024-06-10T21:02:33.134Z",
            "updatedAt": "2024-06-10T21:02:33.134Z"
          }
        ]
      }
    ]
  };

  const cl = plainToInstance(ClientInformation, x);
  console.log('cl', cl);
  return plainToInstance(constructor, plain as T, {
    excludeExtraneousValues: true
  });
}
