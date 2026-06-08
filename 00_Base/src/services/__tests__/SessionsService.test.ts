// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../mapper/index', () => ({
  ReceivedSessionMapper: jest.requireActual(
    '../../mapper/ReceivedSessionMapper',
  ).ReceivedSessionMapper,
  SessionMapper: jest.fn(),
}));

import { SessionsService } from '../SessionsService';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { OcpiHeaders } from '../../model/OcpiHeaders';
import { PaginatedParams } from '../../controllers/param/PaginatedParams';
import {
  GET_SESSION_BY_OCPI_ID,
  INSERT_SESSION_MUTATION,
  UPDATE_SESSION_MUTATION,
} from '../../graphql/queries/session.queries';
import { GET_TRANSACTIONS_QUERY } from '../../graphql/queries/transaction.queries';
import type { SessionDbRow } from '../../graphql/operations';
import type { Session } from '../../model/Session';

jest.mock('../../graphql/OcpiGraphqlClient');

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
  chargingPeriods: null,
  totalCost: null,
  status: 'ACTIVE',
  lastUpdated: '2024-06-15T10:30:00.000Z',
  tenantId: 1,
  tenantPartnerId: 42,
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:30:00.000Z',
};

const mockOcpiSession: Session = {
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
  charging_periods: null,
  total_cost: null,
  status: 'ACTIVE',
  last_updated: new Date('2024-06-15T10:30:00Z'),
} as any;

describe('SessionsService', () => {
  let service: SessionsService;
  let mockGraphqlClient: jest.Mocked<OcpiGraphqlClient>;
  let mockSessionMapper: any;

  beforeEach(() => {
    mockGraphqlClient = {
      request: jest.fn(),
    } as any;
    mockSessionMapper = {
      mapTransactionsToSessions: jest.fn().mockResolvedValue([]),
    };
    service = new SessionsService(mockGraphqlClient, mockSessionMapper);
  });

  describe('getSessions (Sender GET)', () => {
    it('should query Transactions with correct filters', async () => {
      mockGraphqlClient.request.mockResolvedValue({ Transactions: [] });
      mockSessionMapper.mapTransactionsToSessions.mockResolvedValue([]);

      const ocpiHeaders = new OcpiHeaders('FR', 'ZTA', 'FR', 'TMS');
      const params = new PaginatedParams();
      params.limit = 10;
      params.offset = 0;

      await service.getSessions(ocpiHeaders, params);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_TRANSACTIONS_QUERY,
        expect.objectContaining({
          where: expect.objectContaining({
            Tenant: {
              countryCode: { _eq: 'FR' },
              partyId: { _eq: 'TMS' },
            },
            Authorization: {
              TenantPartner: {
                countryCode: { _eq: 'FR' },
                partyId: { _eq: 'ZTA' },
              },
            },
          }),
        }),
      );
    });

    it('should apply date filters when provided', async () => {
      mockGraphqlClient.request.mockResolvedValue({ Transactions: [] });

      const ocpiHeaders = new OcpiHeaders('FR', 'ZTA', 'FR', 'TMS');
      const params = new PaginatedParams();
      params.dateFrom = new Date('2024-01-01');
      params.dateTo = new Date('2024-12-31');

      await service.getSessions(ocpiHeaders, params);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_TRANSACTIONS_QUERY,
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: {
              _gte: '2024-01-01T00:00:00.000Z',
              _lte: '2024-12-31T00:00:00.000Z',
            },
          }),
        }),
      );
    });
  });

  describe('getSessionByOcpiId (Receiver GET)', () => {
    it('should return a mapped session when found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Sessions: [mockDbRow],
      });

      const result = await service.getSessionByOcpiId(
        'FR',
        'TMS',
        'sess-001',
        42,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_SESSION_BY_OCPI_ID,
        {
          countryCode: 'FR',
          partyId: 'TMS',
          ocpiSessionId: 'sess-001',
          tenantPartnerId: 42,
        },
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('sess-001');
      expect(result!.country_code).toBe('FR');
      expect(result!.party_id).toBe('TMS');
      expect(result!.kwh).toBe(12.5);
    });

    it('should return undefined when session is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({ Sessions: [] });

      const result = await service.getSessionByOcpiId(
        'FR',
        'TMS',
        'nonexistent',
        42,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('upsertSession (Receiver PUT)', () => {
    it('should upsert and return the mapped session', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        insert_Sessions_one: mockDbRow,
      });

      const result = await service.upsertSession(mockOcpiSession, 1, 42);

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        INSERT_SESSION_MUTATION,
        expect.objectContaining({
          object: expect.objectContaining({
            ocpiSessionId: 'sess-001',
            countryCode: 'FR',
            partyId: 'TMS',
            tenantId: 1,
            tenantPartnerId: 42,
          }),
        }),
      );
      expect(result.id).toBe('sess-001');
    });

    it('should throw when mutation returns null', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        insert_Sessions_one: null,
      });

      await expect(
        service.upsertSession(mockOcpiSession, 1, 42),
      ).rejects.toThrow('Failed to upsert session sess-001 for FR/TMS');
    });
  });

  describe('patchSession (Receiver PATCH)', () => {
    it('should patch and return the updated session', async () => {
      const updatedRow = {
        ...mockDbRow,
        kwh: 25.0,
        status: 'COMPLETED',
        endDateTime: '2024-06-15T12:00:00.000Z',
      };
      mockGraphqlClient.request.mockResolvedValue({
        update_Sessions: { returning: [updatedRow] },
      });

      const result = await service.patchSession('FR', 'TMS', 'sess-001', 42, {
        kwh: 25.0,
        status: 'COMPLETED' as any,
        last_updated: new Date('2024-06-15T12:00:00Z'),
      });

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        UPDATE_SESSION_MUTATION,
        expect.objectContaining({
          countryCode: 'FR',
          partyId: 'TMS',
          ocpiSessionId: 'sess-001',
          tenantPartnerId: 42,
          set: expect.objectContaining({
            kwh: 25.0,
            status: 'COMPLETED',
          }),
        }),
      );
      expect(result.kwh).toBe(25.0);
    });

    it('should throw when session is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        update_Sessions: { returning: [] },
      });

      await expect(
        service.patchSession('FR', 'TMS', 'nonexistent', 42, {
          kwh: 10,
          last_updated: new Date(),
        }),
      ).rejects.toThrow('Session nonexistent not found for FR/TMS');
    });
  });
});
