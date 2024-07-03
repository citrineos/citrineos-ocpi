'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';
import {
  ChargingStateEnumType,
  IdTokenEnumType,
  ReasonEnumType,
  TransactionEventEnumType,
  TriggerReasonEnumType,
} from '../../citrineos-core/00_Base';
import { OcpiLocationProps } from '@citrineos/ocpi-base/dist/model/OcpiLocation';
import { Sequelize } from 'sequelize-typescript';

const START_ID = 1;

const DUMMY_IDS = {
  OCPI_LOCATION_ID: START_ID,
  LOCATION_ID: START_ID,
  EVSE_ID: START_ID,
  ID_TOKEN: `IDTOKEN-0000${START_ID}`,
  ID_TOKEN_ID: START_ID,
  CHARGING_STATION: START_ID,
  TRANSACTION_ID: START_ID,
  START_TRANSACTION_EVENT: 900001,
  UPDATE_TRANSACTION_EVENT_1: 900002,
  UPDATE_TRANSACTION_EVENT_2: 900003,
  END_TRANSACTION_EVENT: 900004,
};

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    const createEvses = async () => {
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
        {},
      );
    };

    const createIdToken = async () => {
      await queryInterface.bulkInsert(
        'IdTokens',
        [
          {
            id: DUMMY_IDS.ID_TOKEN_ID,
            idToken: DUMMY_IDS.ID_TOKEN,
            type: IdTokenEnumType.eMAID,
            createdAt: new Date(0),
            updatedAt: new Date(),
          },
        ],
        {},
      );
    };

    const createTransaction = async () => await queryInterface.bulkInsert(
        'Transactions',
        [
          {
            stationId: DUMMY_IDS.CHARGING_STATION,
            transactionId: DUMMY_IDS.TRANSACTION_ID,
            evseDatabaseId: DUMMY_IDS.EVSE_ID,
            isActive: false,
            chargingState: ChargingStateEnumType.Idle,
            timeSpentCharging: 7200, // 2 hours
            totalKwh: 40.5,
            stoppedReason: ReasonEnumType.Remote,
            remoteStartId: 1,
            createdAt: new Date(Date.now() - 7200000), // 2 hours ago
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createTransactionEvents = async (transactionDatabaseId: any) => await queryInterface.bulkInsert(
        'TransactionEvents',
        [
          {
            id: DUMMY_IDS.START_TRANSACTION_EVENT,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: TransactionEventEnumType.Started,
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            triggerReason: TriggerReasonEnumType.Authorized,
            seqNo: 1,
            transactionDatabaseId: transactionDatabaseId,
            offline: false,
            numberOfPhasesUsed: 3,
            cableMaxCurrent: 32,
            reservationId: 1,
            evseId: DUMMY_IDS.EVSE_ID,
            idTokenId: DUMMY_IDS.ID_TOKEN_ID,
            transactionInfo: JSON.stringify({
              transactionId: DUMMY_IDS.TRANSACTION_ID,
            }),
            createdAt: new Date(Date.now() - 7200000),
            updatedAt: new Date(Date.now() - 7200000),
          },
          {
            id: DUMMY_IDS.UPDATE_TRANSACTION_EVENT_1,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: TransactionEventEnumType.Updated,
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            triggerReason: TriggerReasonEnumType.MeterValuePeriodic,
            seqNo: 2,
            transactionDatabaseId: transactionDatabaseId,
            offline: false,
            numberOfPhasesUsed: 3,
            cableMaxCurrent: 32,
            evseId: DUMMY_IDS.EVSE_ID,
            idTokenId: DUMMY_IDS.ID_TOKEN_ID,
            transactionInfo: JSON.stringify({
              transactionId: DUMMY_IDS.TRANSACTION_ID,
            }),
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 3600000),
          },
          {
            id: DUMMY_IDS.UPDATE_TRANSACTION_EVENT_2,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: TransactionEventEnumType.Updated,
            timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            triggerReason: TriggerReasonEnumType.MeterValuePeriodic,
            seqNo: 3,
            transactionDatabaseId: transactionDatabaseId,
            offline: false,
            numberOfPhasesUsed: 3,
            cableMaxCurrent: 32,
            evseId: DUMMY_IDS.EVSE_ID,
            idTokenId: DUMMY_IDS.ID_TOKEN_ID,
            transactionInfo: JSON.stringify({
              transactionId: DUMMY_IDS.TRANSACTION_ID,
            }),
            createdAt: new Date(Date.now() - 1800000),
            updatedAt: new Date(Date.now() - 1800000),
          },
          {
            id: DUMMY_IDS.END_TRANSACTION_EVENT,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: TransactionEventEnumType.Ended,
            timestamp: new Date().toISOString(), // Now
            triggerReason: TriggerReasonEnumType.StopAuthorized,
            seqNo: 4,
            transactionDatabaseId: transactionDatabaseId,
            offline: false,
            numberOfPhasesUsed: 3,
            cableMaxCurrent: 32,
            evseId: DUMMY_IDS.EVSE_ID,
            idTokenId: DUMMY_IDS.ID_TOKEN_ID,
            transactionInfo: JSON.stringify({
              transactionId: DUMMY_IDS.TRANSACTION_ID,
            }),
            createdAt: new Date(0),
            updatedAt: new Date(),
          },
        ],
        {},
      );

    const createMeterValues = async (transactionDatabaseId: any) => {
      await queryInterface.bulkInsert(
        'MeterValues',
        [
          {
            transactionEventId: DUMMY_IDS.START_TRANSACTION_EVENT,
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                measurand: 'Energy.Active.Import.Register',
                phase: null,
                unitOfMeasure: {
                  unit: 'kWh',
                  multiplier: 1,
                },
                value: 0,
              },
            ]),
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            createdAt: new Date(Date.now() - 7200000),
            updatedAt: new Date(Date.now() - 7200000),
          },
          {
            transactionEventId: DUMMY_IDS.UPDATE_TRANSACTION_EVENT_1,
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                measurand: 'Energy.Active.Import.Register',
                phase: null,
                unitOfMeasure: {
                  unit: 'kWh',
                  multiplier: 1,
                },
                value: 20.5,
              },
            ]),
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            createdAt: new Date(Date.now() - 3600000),
            updatedAt: new Date(Date.now() - 3600000),
          },
          {
            transactionEventId: DUMMY_IDS.UPDATE_TRANSACTION_EVENT_2,
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                measurand: 'Energy.Active.Import.Register',
                phase: null,
                unitOfMeasure: {
                  unit: 'kWh',
                  multiplier: 1,
                },
                value: 35.0,
              },
            ]),
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            createdAt: new Date(Date.now() - 1800000),
            updatedAt: new Date(Date.now() - 1800000),
          },
          {
            transactionEventId: DUMMY_IDS.END_TRANSACTION_EVENT,
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                measurand: 'Energy.Active.Import.Register',
                phase: null,
                unitOfMeasure: {
                  unit: 'kWh',
                  multiplier: 1,
                },
                value: 40.5,
              },
            ]),
            timestamp: new Date().toISOString(),
            createdAt: new Date(0),
            updatedAt: new Date(),
          },
        ],
        {},
      );
    };

    const createLocations = async () => await queryInterface.bulkInsert(
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

    try {
      const location = await createLocations();
      await createOcpiLocations(location);
      await createChargingStation(location);
      await createEvses();
      await createIdToken();
      const transaction = await createTransaction();
      const transactionDatabaseId = (transaction as any).id;
      await createTransactionEvents(transactionDatabaseId);
      await createMeterValues(transactionDatabaseId);

      console.log('Transaction Data seeded successfully');
    } catch (error) {
      console.error('Error seeding Transactions data:', error);
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      // Delete MeterValues
      await queryInterface.bulkDelete(
        'MeterValues',
        {
          transactionEventId: [
            DUMMY_IDS.START_TRANSACTION_EVENT,
            DUMMY_IDS.UPDATE_TRANSACTION_EVENT_1,
            DUMMY_IDS.UPDATE_TRANSACTION_EVENT_2,
            DUMMY_IDS.END_TRANSACTION_EVENT,
          ],
        },
        {},
      );

      // Delete TransactionEvents
      await queryInterface.bulkDelete(
        'TransactionEvents',
        {
          id: [
            DUMMY_IDS.START_TRANSACTION_EVENT,
            DUMMY_IDS.UPDATE_TRANSACTION_EVENT_1,
            DUMMY_IDS.UPDATE_TRANSACTION_EVENT_2,
            DUMMY_IDS.END_TRANSACTION_EVENT,
          ],
        },
        {},
      );

      // Delete Transaction
      await queryInterface.bulkDelete(
        'Transactions',
        {
          createdAt: new Date(0),
        },
        {},
      );

      // Delete IdToken
      await queryInterface.bulkDelete(
        'IdTokens',
        {
          createdAt: new Date(0),
        },
        {},
      );

      // Delete EVSE
      await queryInterface.bulkDelete(
        'Evses',
        {
          createdAt: new Date(0),
        },
        {},
      );

      // Delete ChargingStation
      await queryInterface.bulkDelete(
        'ChargingStations',
        {
          createdAt: new Date(0),
        },
        {},
      );

      // Delete Location
      await queryInterface.bulkDelete(
        'Locations',
        {
          createdAt: new Date(0),
        },
        {},
      );

      // Delete OCPILocations
      await queryInterface.bulkDelete(
        'OcpiLocations',
        {
          createdAt: new Date(0),
        },
        {},
      );

      console.log('Transaction data reverted successfully');
    } catch (error) {
      console.error('Error reverting Transactions data:', error);
    }
  },
};
