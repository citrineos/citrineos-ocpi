'use strict';

import {QueryInterface, QueryOptions} from 'sequelize';
import {VersionNumber} from '../src/model/VersionNumber';
import {ModuleId} from '../src/model/ModuleId';
import {InterfaceRole} from '../src/model/InterfaceRole';
import {CountryCode} from '../src/util/util';
import {Role} from '../src/model/Role';
import {Imagecategory} from '../src/model/Imagecategory';
import {ImageType} from '../src/model/Image';
import {IVersion} from "../src/model/Version";

enum VersionsTableName {
  ClientVersions = 'ClientVersions',
  ServerVersions = 'ServerVersions',
}

/** @type {import('sequelize-cli').Migration} */
export = {

  up: async (queryInterface: QueryInterface) => {

    const baseServerUrl = 'https://localhost:8085';
    const baseClientUrl = 'https://localhost:8086';
    const moduleList: ModuleId[] = [
      ModuleId.Credentials,
      ModuleId.Versions,
      ModuleId.Cdrs,
      ModuleId.Chargingprofiles,
      ModuleId.Commands,
      ModuleId.Locations,
      ModuleId.Sessions,
      ModuleId.Tariffs,
      ModuleId.Tokens
    ];

    const resetIndexes = async (tableName: string) => {
      // Reset the sequence
      await queryInterface.sequelize.query(`
          SELECT setval('"${tableName}_id_seq"', (SELECT MAX(id) FROM "${tableName}"));
      `);
    };

    const createVersion = async (
      versionsTableName: VersionsTableName,
      clientInformation: any,
      versionNumber: VersionNumber,
      baseUrl: string
    ): Promise<any[]> => {
      const version = {
        createdAt: new Date(),
        updatedAt: new Date(),
        clientInformationId: clientInformation.id,
        version: versionNumber,
        url: baseUrl
      };
      console.log(`inserting ${versionsTableName}`, version);
      const result = await queryInterface.bulkInsert(
        versionsTableName,
        [
          version
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes(versionsTableName);
      console.log(`${versionsTableName} result`, result);
      return result as any[];
    };

    const createEndpoints = async (
      versionsTableName: VersionsTableName,
      version: IVersion,
      moduleId: ModuleId,
      interfaceRole: InterfaceRole,
      baseUrl: string
    ): Promise<any[]> => {
      const endpoint: any = {
        createdAt: new Date(),
        updatedAt: new Date(),
        identifier: moduleId,
        role: interfaceRole,
        url: `${baseUrl}/ocpi/${moduleId}/`
      };
      if (versionsTableName === VersionsTableName.ClientVersions) {
        endpoint.clientVersionId = version.id;
      } else if (versionsTableName === VersionsTableName.ServerVersions) {
        endpoint.serverVersionId = version.id;
      }
      console.log('inserting Endpoint', endpoint);
      const result = await queryInterface.bulkInsert(
        'Endpoints',
        [
          endpoint
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('Endpoints');
      console.log('Endpoint result', result);
      return result as any[];
    };

    const createImage = async (businessDetails: any): Promise<any[]> => {
      const image = {
        createdAt: new Date(),
        updatedAt: new Date(),
        businessDetailsId: businessDetails.id,
        url: 'http://example.com/logo.png',
        thumbnail: 'http://example.com/thumbnail.png',
        category: Imagecategory.ENTRANCE,
        type: ImageType.png,
        width: 100,
        height: 100
      };
      console.log('inserting Image', image);
      const result = await queryInterface.bulkInsert(
        'Images',
        [
          image
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('Images');
      console.log('Image result', result);
      return result as any[];
    };

    const createServerBusinessDetails = async (serverCredentialsRole: any): Promise<any[]> => {
      const serverBusinessDetails = {
        createdAt: new Date(),
        updatedAt: new Date(),
        serverCredentialsRoleId: serverCredentialsRole.id,
        name: 'Example CPO',
        website: 'http://example.com',
      };
      console.log('inserting BusinessDetails', serverBusinessDetails);
      const result = await queryInterface.bulkInsert(
        'BusinessDetails',
        [
          serverBusinessDetails
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('BusinessDetails');
      console.log('createServerBusinessDetails result', result);
      await createImage((result as any)[0]);
      return result as any[];
    };

    const createServerCredentialsRoles = async (cpoTenant: any): Promise<any[]> => {
      const serverCredentialsRole = {
        createdAt: new Date(),
        updatedAt: new Date(),
        cpoTenantId: cpoTenant.id,
        role: Role.CPO,
        country_code: CountryCode.US,
        party_id: 'CPO'
      };
      console.log('inserting ServerCredentialsRole', serverCredentialsRole);
      const result = await queryInterface.bulkInsert(
        'ServerCredentialsRoles',
        [
          serverCredentialsRole
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('ServerCredentialsRoles');
      console.log('ServerCredentialsRole result', result);
      await createServerBusinessDetails((result as any)[0]);
      return result as any[];
    };

    const createCpoTenants = async (): Promise<any[]> => {
      const cpoTenant = {
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('inserting CpoTenant', cpoTenant);
      const result = await queryInterface.bulkInsert(
        'CpoTenants',
        [
          cpoTenant
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('CpoTenants');
      console.log('CpoTenant result', result);
      await createServerCredentialsRoles((result as any)[0]);
      return result as any[];
    };

    const createClientInformation = async (cpoTenant: any): Promise<any[]> => {
      const clientInformation = {
        createdAt: new Date(),
        updatedAt: new Date(),
        cpoTenantId: cpoTenant.id,
        clientToken: '123',
        serverToken: '123',
        registered: false,
      };
      console.log('inserting ClientInformation', clientInformation);
      const result = await queryInterface.bulkInsert(
        'ClientInformations',
        [
          clientInformation
        ],
        {
          returning: true
        } as QueryOptions,
      );
      console.log('ClientInformation result', result);
      return result as any[];
    };

    const createAndServerClientVersionDetails = async (clientInformation: any): Promise<void> => {
      const clientVersions = await createVersion(VersionsTableName.ClientVersions, clientInformation, VersionNumber.TWO_DOT_TWO_DOT_ONE, baseClientUrl);
      const clientVersion = clientVersions[0];
      for (let i = 0; i < moduleList.length; i++) {
        const moduleId = moduleList[i];
        await createEndpoints(VersionsTableName.ClientVersions, clientVersion, moduleId, InterfaceRole.RECEIVER, baseClientUrl);
      }
      const serverVersions = await createVersion(VersionsTableName.ServerVersions, clientInformation, VersionNumber.TWO_DOT_TWO_DOT_ONE, baseServerUrl);
      const serverVersion = serverVersions[0];
      for (let i = 0; i < moduleList.length; i++) {
        const moduleId = moduleList[i];
        await createEndpoints(VersionsTableName.ServerVersions, serverVersion, moduleId, InterfaceRole.SENDER, baseServerUrl);
      }
    };

    const createClientBusinessDetails = async (clientCredentialsRole: any): Promise<any[]> => {
      const clientBusinessDetails = {
        createdAt: new Date(),
        updatedAt: new Date(),
        clientCredentialsRoleId: clientCredentialsRole.id,
        name: 'Example Operator',
        website: 'http://example.com',
      };
      console.log('inserting BusinessDetails', clientBusinessDetails);
      const result = await queryInterface.bulkInsert(
        'BusinessDetails',
        [
          clientBusinessDetails
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('BusinessDetails');
      console.log('createClientBusinessDetails result', result);
      await createImage((result as any)[0]);
      return result as any[];
    };

    const createClientCredentialsRoles = async (clientInformation: any): Promise<any[]> => {
      const clientCredentialsRole = {
        createdAt: new Date(),
        updatedAt: new Date(),
        role: Role.EMSP,
        clientInformationId: clientInformation.id,
        cpoTenantId: clientInformation.cpoTenantId,
        country_code: CountryCode.US,
        party_id: 'MSP'
      };
      console.log('inserting ClientCredentialsRole', clientCredentialsRole);
      const result = await queryInterface.bulkInsert(
        'ClientCredentialsRoles',
        [
          clientCredentialsRole
        ],
        {
          returning: true
        } as QueryOptions,
      );
      await resetIndexes('ClientCredentialsRoles');
      console.log('ClientCredentialsRole result', result);
      await createClientBusinessDetails((result as any)[0]);
      return result as any[];
    };

    try {
      const cpoTenants = await createCpoTenants();
      const cpoTenant = cpoTenants[0];
      const clientInformations = await createClientInformation(cpoTenant);
      const clientInformation = clientInformations[0];
      await createAndServerClientVersionDetails(clientInformation);
      await createClientCredentialsRoles(clientInformation);
      console.log('Credentials data seeded successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      console.log('Credentials data reverted successfully');
    } catch (error) {
      console.error('Error reverting credentials data:', error);
    }
  },
};
