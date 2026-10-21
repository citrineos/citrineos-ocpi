// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ReceivedSessionMapper } from '../ReceivedSessionMapper';
import type { SessionDbRow } from '../../graphql/operations';
import type { Session } from '../../model/Session';

const mockSession: Session = {
  country_code: 'FR',
  party_id: 'TMS',
  id: 'sess-001',
  start_date_time: new Date('2024-06-15T10:00:00Z'),
  end_date_time: null,
  kwh: 12.5,
  cdr_token: {
    uid: 'TOKEN-001',
    type: 'RFID',
    contract_id: 'CONTRACT-001',
    country_code: 'FR',
    party_id: 'ZTA',
  },
  auth_method: 'WHITELIST',
  authorization_reference: null,
  location_id: 'LOC-001',
  evse_uid: 'EVSE-001',
  connector_id: '1',
  meter_id: null,
  currency: 'EUR',
  charging_periods: [
    {
      start_date_time: new Date('2024-06-15T10:00:00Z'),
      dimensions: [{ type: 'ENERGY', volume: 12.5 }],
      tariff_id: '1',
    },
  ],
  total_cost: { excl_vat: 3.12 },
  status: 'ACTIVE',
  last_updated: new Date('2024-06-15T10:30:00Z'),
} as any;

const mockDbRow: SessionDbRow = {
  id: 1,
  ocpiSessionId: 'sess-001',
  countryCode: 'FR',
  partyId: 'TMS',
  startDateTime: '2024-06-15T10:00:00.000Z',
  endDateTime: null,
  kwh: 12.5,
  cdrToken: {
    uid: 'TOKEN-001',
    type: 'RFID',
    contract_id: 'CONTRACT-001',
    country_code: 'FR',
    party_id: 'ZTA',
  },
  authMethod: 'WHITELIST',
  authorizationReference: null,
  locationId: 'LOC-001',
  evseUid: 'EVSE-001',
  connectorId: '1',
  meterId: null,
  currency: 'EUR',
  chargingPeriods: [
    {
      start_date_time: '2024-06-15T10:00:00.000Z',
      dimensions: [{ type: 'ENERGY', volume: 12.5 }],
      tariff_id: '1',
    },
  ],
  totalCost: { excl_vat: 3.12 },
  status: 'ACTIVE',
  lastUpdated: '2024-06-15T10:30:00.000Z',
  tenantId: 1,
  tenantPartnerId: 42,
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:30:00.000Z',
};

describe('ReceivedSessionMapper', () => {
  describe('mapFromOcpi', () => {
    it('should map an OCPI Session to DB insert input', () => {
      const result = ReceivedSessionMapper.mapFromOcpi(
        mockSession,
        1,
        42,
        null,
      );

      expect(result.ocpiSessionId).toBe('sess-001');
      expect(result.countryCode).toBe('FR');
      expect(result.partyId).toBe('TMS');
      expect(result.kwh).toBe(12.5);
      expect(result.authMethod).toBe('WHITELIST');
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('ACTIVE');
      expect(result.tenantId).toBe(1);
      expect(result.tenantPartnerId).toBe(42);
      expect(result.endDateTime).toBeNull();
      expect(result.cdrToken).toEqual(mockSession.cdr_token);
      expect(result.chargingPeriods).toEqual(mockSession.charging_periods);
      expect(result.totalCost).toEqual(mockSession.total_cost);
    });

    it('should map end_date_time when provided', () => {
      const sessionWithEnd = {
        ...mockSession,
        end_date_time: new Date('2024-06-15T12:00:00Z'),
      };
      const result = ReceivedSessionMapper.mapFromOcpi(
        sessionWithEnd as Session,
        1,
        42,
        null,
      );

      expect(result.endDateTime).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('mapToOcpi', () => {
    it('should map a DB row back to an OCPI Session', () => {
      const result = ReceivedSessionMapper.mapToOcpi(mockDbRow);

      expect(result.country_code).toBe('FR');
      expect(result.party_id).toBe('TMS');
      expect(result.id).toBe('sess-001');
      expect(result.kwh).toBe(12.5);
      expect(result.auth_method).toBe('WHITELIST');
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('ACTIVE');
      expect(result.end_date_time).toBeNull();
      expect(result.cdr_token).toEqual(mockDbRow.cdrToken);
      expect(result.start_date_time).toBeInstanceOf(Date);
      expect(result.last_updated).toBeInstanceOf(Date);
    });

    it('should map end_date_time when present', () => {
      const rowWithEnd = {
        ...mockDbRow,
        endDateTime: '2024-06-15T12:00:00.000Z',
      };
      const result = ReceivedSessionMapper.mapToOcpi(rowWithEnd);

      expect(result.end_date_time).toBeInstanceOf(Date);
      expect(result.end_date_time!.toISOString()).toBe(
        '2024-06-15T12:00:00.000Z',
      );
    });
  });

  describe('mapPartialFromOcpi', () => {
    it('should map partial fields to DB _set input', () => {
      const partial: Partial<Session> = {
        kwh: 25.0,
        status: 'COMPLETED' as any,
        end_date_time: new Date('2024-06-15T12:00:00Z'),
        last_updated: new Date('2024-06-15T12:00:00Z'),
      };

      const result = ReceivedSessionMapper.mapPartialFromOcpi(partial);

      expect(result.kwh).toBe(25.0);
      expect(result.status).toBe('COMPLETED');
      expect(result.endDateTime).toBe('2024-06-15T12:00:00.000Z');
      expect(result.lastUpdated).toBe('2024-06-15T12:00:00.000Z');
      expect(result.updatedAt).toBeDefined();
    });

    it('should only include fields that are present in the partial', () => {
      const partial: Partial<Session> = {
        kwh: 15.0,
        last_updated: new Date('2024-06-15T11:00:00Z'),
      };

      const result = ReceivedSessionMapper.mapPartialFromOcpi(partial);

      expect(result.kwh).toBe(15.0);
      expect(result.lastUpdated).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.status).toBeUndefined();
      expect(result.endDateTime).toBeUndefined();
      expect(result.currency).toBeUndefined();
    });

    it('should handle null end_date_time', () => {
      const partial: Partial<Session> = {
        end_date_time: null,
        last_updated: new Date('2024-06-15T11:00:00Z'),
      };

      const result = ReceivedSessionMapper.mapPartialFromOcpi(partial);

      expect(result.endDateTime).toBeNull();
    });

    it('should include roamingPartnerId only when one is given', () => {
      const withRoaming = ReceivedSessionMapper.mapFromOcpi(
        mockSession,
        1,
        42,
        7,
      );
      expect(withRoaming.roamingPartnerId).toBe(7);

      const withoutRoaming = ReceivedSessionMapper.mapFromOcpi(
        mockSession,
        1,
        42,
        null,
      );
      expect(withoutRoaming).not.toHaveProperty('roamingPartnerId');
    });
  });
});
