'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';
import { OcpiLocationProps } from '@citrineos/ocpi-base';
import { Sequelize } from 'sequelize-typescript';

const START_ID = 1;

const DUMMY_IDS = {
  OCPI_LOCATION_ID: START_ID,
  LOCATION_ID: START_ID,
  EVSE_ID: START_ID,
  CHARGING_STATION: START_ID,
};

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const createEvses: any = async () =>
      await queryInterface.bulkInsert(
        'Evses',
        [
          {
            databaseId: DUMMY_IDS.EVSE_ID,
            id: DUMMY_IDS.EVSE_ID,
            connectorId: 1,
            createdAt: new Date(0),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createLocations: any = async () =>
      await queryInterface.bulkInsert(
        'Locations',
        [
          {
            name: 'name',
            address: 'address',
            city: 'city',
            postalCode: 'postalCode',
            state: 'state',
            country: 'country',
            coordinates: Sequelize.fn('ST_GeomFromText', 'POINT(74 41)'), // converts to needed Geometry object
            createdAt: new Date(0),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createOcpiLocations = async (location: any) => {
      await queryInterface.bulkInsert('OcpiLocations', [
        {
          [OcpiLocationProps.citrineLocationId]: location.id,
          [OcpiLocationProps.publish]: true,
          [OcpiLocationProps.lastUpdated]: new Date(),
          [OcpiLocationProps.partyId]: 'CPO',
          [OcpiLocationProps.countryCode]: 'US',
          createdAt: new Date(0),
          updatedAt: new Date(),
        },
      ]);
    };

    const createOcpiEvse = async () => {
      await queryInterface.bulkInsert('OcpiEvses', [
        {
          evseId: DUMMY_IDS.EVSE_ID,
          stationId: DUMMY_IDS.CHARGING_STATION,
          createdAt: new Date(0),
          updatedAt: new Date(),
          lastUpdated: new Date(),
        },
      ]);
    };

    const createOcpiConnectors = async () => {
      await queryInterface.bulkInsert('OcpiConnectors', [
        {
          connectorId: 1,
          evseId: DUMMY_IDS.EVSE_ID,
          stationId: DUMMY_IDS.CHARGING_STATION,
          createdAt: new Date(0),
          updatedAt: new Date(),
          lastUpdated: new Date(),
        },
      ]);
    };

    const createChargingStation = async (location: any) => {
      await queryInterface.bulkInsert('ChargingStations', [
        {
          id: DUMMY_IDS.CHARGING_STATION,
          isOnline: true,
          locationId: location.id,
          createdAt: new Date(0),
          updatedAt: new Date(),
        },
      ]);
    };

    const createChargingStationComponent: any = async () =>
      await queryInterface.bulkInsert(
        'Components',
        [
          {
            name: 'ChargingStation',
            instance: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createEvseComponent: any = async (evse: any) =>
      await queryInterface.bulkInsert(
        'Components',
        [
          {
            name: 'EVSE',
            instance: 1,
            evseDatabaseId: evse.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createConnectorComponent: any = async (evse: any) =>
      await queryInterface.bulkInsert(
        'Components',
        [
          {
            name: 'Connector',
            instance: 1,
            evseDatabaseId: evse.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createVariables: any = async () => {
      await queryInterface.bulkInsert('Variables', [
        {
          id: 4,
          name: 'Mode',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 5,
          name: 'VendorName',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 6,
          name: 'SerialNumber',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 18,
          name: 'AvailabilityState',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 19,
          name: 'EvseId',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 20,
          name: 'DCVoltage',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 21,
          name: 'DCCurrent',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 22,
          name: 'Power',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 23,
          name: 'ConnectorType',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    };

    const createChargingStationVariableAttributes: any = async (
      chargingStationComponent: any,
    ) =>
      await queryInterface.bulkInsert('VariableAttributes', [
        {
          stationId: 1,
          variableId: 4,
          componentId: chargingStationComponent.id,
          value: 'localCharger',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 5,
          componentId: chargingStationComponent.id,
          value: 'local',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 6,
          componentId: chargingStationComponent.id,
          value: 'SERIALCHARGER01',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

    const createEvseVariableAttributes: any = async (evseComponent: any) =>
      await queryInterface.bulkInsert('VariableAttributes', [
        {
          stationId: 1,
          variableId: 18,
          componentId: evseComponent.id,
          value: 'Available',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 19,
          componentId: evseComponent.id,
          value: 'EvseId1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 20,
          componentId: evseComponent.id,
          value: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 21,
          componentId: evseComponent.id,
          value: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 22,
          componentId: evseComponent.id,
          value: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

    const createConnectorVariableAttributes: any = async (
      connectorComponent: any,
    ) =>
      await queryInterface.bulkInsert('VariableAttributes', [
        {
          stationId: 1,
          variableId: 18,
          componentId: connectorComponent.id,
          value: 'Available',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stationId: 1,
          variableId: 23,
          componentId: connectorComponent.id,
          value: 'cCCS1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

    try {
      const location = await createLocations();
      await createOcpiLocations(location[0]);
      await createChargingStation(location[0]);
      const evse = await createEvses();
      await createOcpiEvse();
      await createOcpiConnectors();
      const chargingStationComponent = await createChargingStationComponent();
      const evseComponent = await createEvseComponent(evse[0]);
      const connectorComponent = await createConnectorComponent(evse[0]);
      await createVariables();
      await createChargingStationVariableAttributes(
        chargingStationComponent[0],
      );
      await createEvseVariableAttributes(evseComponent[0]);
      await createConnectorVariableAttributes(connectorComponent[0]);

      console.log('Location Data seeded successfully');
    } catch (error) {
      console.error('Error seeding Transactions data:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      // Delete EVSE
      await queryInterface.bulkDelete('Evses', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      // Delete ChargingStation
      await queryInterface.bulkDelete('ChargingStations', {}, {
        cascade: true,
      } as QueryOptions);

      // Delete Location
      await queryInterface.bulkDelete('Locations', {}, {
        cascade: true,
      } as QueryOptions);

      // Delete OCPILocations
      await queryInterface.bulkDelete('OcpiLocations', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      // Delete OCPILocations
      await queryInterface.bulkDelete('OcpiEvses', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      // Delete OCPILocations
      await queryInterface.bulkDelete('OcpiConnectors', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      await queryInterface.bulkDelete('Variables', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      await queryInterface.bulkDelete('VariableAttributes', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      await queryInterface.bulkDelete('Components', {}, {
        truncate: true,
        cascade: true,
      } as QueryOptions);

      console.log('Transaction data reverted successfully');
    } catch (error) {
      console.error('Error reverting Transactions data:', error);
    }
  },
};
