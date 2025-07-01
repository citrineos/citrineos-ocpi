'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';
import { OCPP2_0_1 } from '@citrineos/base';

const START_ID = 1;

const DUMMY_IDS = {
  OCPI_LOCATION_ID: START_ID,
  LOCATION_ID: START_ID,
  EVSE_ID: START_ID,
  ID_TOKEN: START_ID,
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
    const createTransaction: any = async () =>
      await queryInterface.bulkInsert(
        'Transactions',
        [
          {
            stationId: DUMMY_IDS.CHARGING_STATION,
            transactionId: DUMMY_IDS.TRANSACTION_ID,
            evseDatabaseId: DUMMY_IDS.EVSE_ID,
            isActive: false,
            chargingState: OCPP2_0_1.ChargingStateEnumType.Idle,
            timeSpentCharging: 7200, // 2 hours
            totalKwh: 40.5,
            stoppedReason: OCPP2_0_1.ReasonEnumType.Remote,
            remoteStartId: 1,
            createdAt: new Date('2024-04-03T13:55:49.466Z'),
            updatedAt: new Date(),
          },
        ],
        {
          returning: true,
        } as QueryOptions,
      );

    const createTransactionEvents = async (transactionDatabaseId: any) =>
      await queryInterface.bulkInsert(
        'TransactionEvents',
        [
          {
            id: DUMMY_IDS.START_TRANSACTION_EVENT,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: OCPP2_0_1.TransactionEventEnumType.Started,
            timestamp: new Date('2024-04-03T13:55:49.466Z').toISOString(),
            triggerReason: OCPP2_0_1.TriggerReasonEnumType.Authorized,
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
            createdAt: new Date('2024-04-03T13:55:49.466Z'),
            updatedAt: new Date('2024-04-03T13:55:49.466Z'),
          },
          {
            id: DUMMY_IDS.UPDATE_TRANSACTION_EVENT_1,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: OCPP2_0_1.TransactionEventEnumType.Updated,
            timestamp: new Date('2024-04-03T14:00:00.147Z').toISOString(),
            triggerReason: OCPP2_0_1.TriggerReasonEnumType.MeterValuePeriodic,
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
            createdAt: new Date('2024-04-03T14:00:00.147Z'),
            updatedAt: new Date('2024-04-03T14:00:00.147Z'),
          },
          {
            id: DUMMY_IDS.END_TRANSACTION_EVENT,
            stationId: DUMMY_IDS.CHARGING_STATION,
            eventType: OCPP2_0_1.TransactionEventEnumType.Ended,
            timestamp: new Date('2024-04-03T14:01:23.297Z').toISOString(),
            triggerReason: OCPP2_0_1.TriggerReasonEnumType.StopAuthorized,
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
            createdAt: new Date('2024-04-03T14:01:23.297Z'),
            updatedAt: new Date('2024-04-03T14:01:23.297Z'),
          },
        ],
        {},
      );

    const createMeterValues = async (transactionDatabaseId: any) => {
      await queryInterface.bulkInsert(
        'MeterValues',
        [
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0,
              },
              {
                context: 'Transaction.Begin',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0,
              },
            ]),
            timestamp: new Date('2024-04-03T13:55:48.914Z').toISOString(),
            createdAt: new Date('2024-04-03T13:55:48.914Z'),
            updatedAt: new Date('2024-04-03T13:55:48.914Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 21.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 7.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 7.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 7.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 225.00149536132813,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 225.00149536132813,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 225.00149536132813,
              },
            ]),
            timestamp: new Date('2024-04-03T13:55:59.015Z').toISOString(),
            createdAt: new Date('2024-04-03T13:55:59.015Z'),
            updatedAt: new Date('2024-04-03T13:55:59.015Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 171.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 57.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 57.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 57.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.107704162597656,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.107704162597656,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.107704162597656,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.201346293091774,
              },
            ]),
            timestamp: new Date('2024-04-03T13:56:49.541Z').toISOString(),
            createdAt: new Date('2024-04-03T13:56:49.541Z'),
            updatedAt: new Date('2024-04-03T13:56:49.541Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 200.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 67.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 67.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 67.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.95834350585938,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.95834350585938,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.95834350585938,
              },
            ]),
            timestamp: new Date('2024-04-03T13:56:59.615Z').toISOString(),
            createdAt: new Date('2024-04-03T13:56:59.615Z'),
            updatedAt: new Date('2024-04-03T13:56:59.615Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 347.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 116.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 116.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 116.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.045677185058594,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.045677185058594,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.045677185058594,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.2005709707736969,
              },
            ]),
            timestamp: new Date('2024-04-03T13:57:49.049Z').toISOString(),
            createdAt: new Date('2024-04-03T13:57:49.049Z'),
            updatedAt: new Date('2024-04-03T13:57:49.049Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 377.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 126.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 126.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 126.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.17013549804688,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.17013549804688,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.17013549804688,
              },
            ]),
            timestamp: new Date('2024-04-03T13:57:59.112Z').toISOString(),
            createdAt: new Date('2024-04-03T13:57:59.112Z'),
            updatedAt: new Date('2024-04-03T13:57:59.112Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 523.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 174.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 174.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 174.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.886229515075684,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.886229515075684,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.886229515075684,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.1985778659582138,
              },
            ]),
            timestamp: new Date('2024-04-03T13:58:48.549Z').toISOString(),
            createdAt: new Date('2024-04-03T13:58:48.549Z'),
            updatedAt: new Date('2024-04-03T13:58:48.549Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 556.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 185.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 185.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 185.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.9342041015625,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.9342041015625,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.9342041015625,
              },
            ]),
            timestamp: new Date('2024-04-03T13:58:59.632Z').toISOString(),
            createdAt: new Date('2024-04-03T13:58:59.632Z'),
            updatedAt: new Date('2024-04-03T13:58:59.632Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 702.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 234.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 234.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 234.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.126832962036133,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.126832962036133,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.126832962036133,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.20158541202545166,
              },
            ]),
            timestamp: new Date('2024-04-03T13:59:49.077Z').toISOString(),
            createdAt: new Date('2024-04-03T13:59:49.077Z'),
            updatedAt: new Date('2024-04-03T13:59:49.077Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 732.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 244.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 244.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 244.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.07337951660156,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.07337951660156,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 222.07337951660156,
              },
            ]),
            timestamp: new Date('2024-04-03T13:59:59.175Z').toISOString(),
            createdAt: new Date('2024-04-03T13:59:59.175Z'),
            updatedAt: new Date('2024-04-03T13:59:59.175Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 879.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 293.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 293.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 293.0,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.023082733154297,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.023082733154297,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 16.023082733154297,
              },
              {
                context: 'Sample.Periodic',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.2002885341644287,
              },
            ]),
            timestamp: new Date('2024-04-03T14:00:48.657Z').toISOString(),
            createdAt: new Date('2024-04-03T14:00:48.657Z'),
            updatedAt: new Date('2024-04-03T14:00:48.657Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 911.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 304.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 304.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 304.0,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L1-N',
                unitOfMeasure: {
                  unit: 'V',
                },
                value: 221.85638427734375,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L2-N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 221.85638427734375,
              },
              {
                context: 'Sample.Clock',
                location: 'Outlet',
                measurand: 'Voltage',
                phase: 'L3-N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 221.85638427734375,
              },
            ]),
            timestamp: new Date('2024-04-03T14:00:59.730Z').toISOString(),
            createdAt: new Date('2024-04-03T14:00:59.730Z'),
            updatedAt: new Date('2024-04-03T14:00:59.730Z'),
          },
          {
            transactionDatabaseId: transactionDatabaseId,
            sampledValue: JSON.stringify([
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 980.0,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 327.0,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 327.0,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Energy.Active.Import.Register',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'Wh',
                },
                value: 327.0,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L1',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.879820823669434,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L2',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.879820823669434,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'L3',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 15.879820823669434,
              },
              {
                context: 'Transaction.End',
                location: 'Outlet',
                measurand: 'Current.Import',
                phase: 'N',
                unitOfMeasure: {
                  unit: 'A',
                },
                value: 0.19849777221679688,
              },
            ]),
            timestamp: new Date('2024-04-03T14:01:22.936Z').toISOString(),
            createdAt: new Date('2024-04-03T14:01:22.936Z'),
            updatedAt: new Date('2024-04-03T14:01:22.936Z'),
          },
        ],
        {},
      );
    };

    try {
      const transaction = await createTransaction();
      await createTransactionEvents(transaction[0].id);
      await createMeterValues(transaction[0].id);

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
      console.log('Transaction data reverted successfully');
    } catch (error) {
      console.error('Error reverting Transactions data:', error);
    }
  },
};
