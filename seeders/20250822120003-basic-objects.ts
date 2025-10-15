// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import { QueryInterface, QueryOptions } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export = {
  up: async (queryInterface: QueryInterface) => {
    // Create Location
    const location = {
      id: 1,
      name: 'Test Charging Hub',
      address: '123 Electric Avenue',
      city: 'San Francisco',
      postalCode: '94102',
      state: 'CA',
      country: 'USA',
      timeZone: 'America/Los_Angeles',
      publishUpstream: true,
      parkingType: 'AlongMotorway',
      facilities: JSON.stringify(['Cafe', 'ParkingLot', 'Wifi']),
      coordinates: JSON.stringify({
        type: 'Point',
        coordinates: [-122.4194, 37.7749], // [longitude, latitude] for San Francisco
      }),
      openingHours: JSON.stringify({
        twentyfourSeven: true,
      }),
      tenantId: 1, // Assuming tenant exists
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert(
      'Locations',
      [location],
      {} as QueryOptions,
    );

    // Create ChargingStation
    const chargingStation = {
      id: 'cp001',
      isOnline: null,
      protocol: 'ocpp2.0.1',
      chargePointVendor: 'CitrineOS',
      chargePointModel: 'TestStation',
      chargePointSerialNumber: 'CP001-SN-001',
      chargeBoxSerialNumber: 'CB001-SN-001',
      firmwareVersion: '1.0.0',
      meterType: 'EnergyMeter',
      meterSerialNumber: 'EM001-SN-001',
      coordinates: JSON.stringify({
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      }),
      floorLevel: '0',
      parkingRestrictions: JSON.stringify(['EVOnly']),
      capabilities: JSON.stringify(['RFIDReader', 'CreditCardPayable']),
      locationId: 1,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert(
      'ChargingStations',
      [chargingStation],
      {} as QueryOptions,
    );

    // Create EVSE
    const evse = {
      id: 1,
      stationId: 'cp001',
      evseTypeId: 1,
      evseId: 'US*TST*E123456*1', // eMI3 compliant EVSE ID format
      physicalReference: 'EVSE-001-PHYSICAL',
      removed: false,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert('Evses', [evse], {} as QueryOptions);

    // Create Connector
    const connector = {
      id: 1,
      stationId: 'cp001',
      evseId: 1,
      connectorId: 1, // OCPP 1.6 connector ID
      evseTypeConnectorId: 1, // OCPP 2.0.1 connector ID per EVSE
      status: 'Available',
      type: 'IEC62196T2COMBO',
      format: 'Socket',
      powerType: 'AC3Phase',
      maximumAmperage: 32,
      maximumVoltage: 400,
      maximumPowerWatts: 22000,
      errorCode: 'NoError',
      timestamp: new Date(),
      info: 'Test connector for CP001',
      vendorId: 'CitrineOS',
      termsAndConditionsUrl: 'https://citrineos.com/terms',
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert(
      'Connectors',
      [connector],
      {} as QueryOptions,
    );

    // Create Tariff
    const tariff = {
      id: 1,
      stationId: 'cp001',
      connectorId: 1,
      currency: 'USD',
      pricePerKwh: 0.3,
      pricePerMin: 0.05,
      pricePerSession: 1.5,
      authorizationAmount: 25.0,
      paymentFee: 0.35,
      taxRate: 0.0875, // 8.75% tax rate
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert('Tariffs', [tariff], {} as QueryOptions);

    // Create Authorization with Real-Time Auth enabled
    const authorization = {
      id: 1,
      idToken: 'DEADBEEF',
      idTokenType: 'ISO14443',
      additionalInfo: JSON.stringify([
        {
          additionalIdToken: 'USTSTC012345678',
          type: 'eMAID',
        },
        {
          additionalIdToken: 'CitrineOS',
          type: 'issuer',
        },
        {
          additionalIdToken: '02345',
          type: 'visual_number',
        },
      ]),
      status: 'Accepted',
      chargingPriority: 1,
      language1: 'en',
      realTimeAuth: 'AllowedOffline',
      realTimeAuthUrl:
        'http://citrineos-ocpi:8085/ocpi/2.2.1/tokens/realTimeAuth',
      concurrentTransaction: false,
      tenantId: 1,
      tenantPartnerId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert(
      'Authorizations',
      [authorization],
      {} as QueryOptions,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    // Delete in reverse order to respect foreign key constraints
    await queryInterface.bulkDelete(
      'Authorizations',
      { id: 1 },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete('Tariffs', { id: 1 }, {} as QueryOptions);
    await queryInterface.bulkDelete(
      'Connectors',
      { id: 1 },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete('Evses', { id: 1 }, {} as QueryOptions);
    await queryInterface.bulkDelete(
      'ChargingStations',
      { id: 'cp001' },
      {} as QueryOptions,
    );
    await queryInterface.bulkDelete('Locations', { id: 1 }, {} as QueryOptions);
  },
};
