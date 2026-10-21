// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// @zetra/citrineos-base is ESM-only ("type": "module", ships only dist/*.js) and Jest's
// CJS runtime cannot parse it — transformIgnorePatterns un-ignores @citrineos, not @zetra.
// Reached via SessionsService -> SessionsClientApi -> BaseClientApi:14.
// Same stub as SessionBroadcastDedupeService.test.ts / CdrsClientApi.http.test.ts.
jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Get: 'GET',
    Put: 'PUT',
    Post: 'POST',
    Patch: 'PATCH',
    Delete: 'DELETE',
  },
  HttpHeader: { Authorization: 'Authorization' },
}));

jest.mock('../../mapper/index', () => ({
  ReceivedSessionMapper: jest.requireActual(
    '../../mapper/ReceivedSessionMapper',
  ).ReceivedSessionMapper,
  SessionMapper: jest.fn(),
}));

import { Logger } from 'tslog';
import type { ILogObj } from 'tslog';
import { SessionsService } from '../SessionsService';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { OcpiHeaders } from '../../model/OcpiHeaders';
import { PaginatedParams } from '../../controllers/param/PaginatedParams';
import {
  FIND_SESSION_P2P_QUERY,
  GET_SESSION_BY_OCPI_ID,
  GET_SESSION_BY_OCPI_ID_ROAMING_QUERY,
  INSERT_SESSION_MUTATION,
  UPDATE_SESSION_BY_PK_MUTATION,
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

/**
 * Direct (P2P) partner: identity matches the session's country_code/party_id and it
 * carries no roamingPartners, so getRoamingPartner() returns null and the service
 * takes the P2P query branch.
 */
const mockTenantPartner = {
  id: 42,
  countryCode: 'FR',
  partyId: 'TMS',
  roamingPartners: [],
} as any;

/** Hub partner whose roamingPartners contain the session's FR/TMS identity. */
const mockRoamingTenantPartner = {
  id: 42,
  countryCode: 'FR',
  partyId: 'ZTA',
  roamingPartners: [{ id: 7, countryCode: 'FR', partyId: 'TMS' }],
} as any;

describe('SessionsService', () => {
  let service: SessionsService;
  let mockGraphqlClient: jest.Mocked<OcpiGraphqlClient>;
  let mockSessionMapper: any;
  let mockSessionsClientApi: any;

  beforeEach(() => {
    mockGraphqlClient = {
      request: jest.fn(),
    } as any;
    mockSessionMapper = {
      mapTransactionsToSessions: jest.fn().mockResolvedValue([]),
    };
    mockSessionsClientApi = {
      getSession: jest.fn(),
      putSession: jest.fn(),
      patchSession: jest.fn(),
    };
    service = new SessionsService(
      mockGraphqlClient,
      new Logger<ILogObj>({ type: 'hidden' }),
      mockSessionsClientApi,
      mockSessionMapper,
    );
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
    it('should use the P2P query and return a mapped session when found', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Sessions: [mockDbRow],
      });

      const result = await service.getSessionByOcpiId(
        'FR',
        'TMS',
        'sess-001',
        42,
        mockTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_SESSION_BY_OCPI_ID,
        {
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

    it('should use the roaming query when the identity resolves to a roaming partner', async () => {
      mockGraphqlClient.request.mockResolvedValue({
        Sessions: [mockDbRow],
      });

      const result = await service.getSessionByOcpiId(
        'FR',
        'TMS',
        'sess-001',
        42,
        mockRoamingTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        GET_SESSION_BY_OCPI_ID_ROAMING_QUERY,
        {
          ocpiSessionId: 'sess-001',
          tenantPartnerId: 42,
          roamingPartnerId: 7,
        },
      );
      expect(result!.id).toBe('sess-001');
    });

    it('should return undefined when session is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({ Sessions: [] });

      const result = await service.getSessionByOcpiId(
        'FR',
        'TMS',
        'nonexistent',
        42,
        mockTenantPartner,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('upsertSession (Receiver PUT)', () => {
    it('should insert when no existing row is found', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Sessions: [] })
        .mockResolvedValueOnce({ insert_Sessions_one: mockDbRow });

      const result = await service.upsertSession(
        mockOcpiSession,
        1,
        42,
        mockTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        1,
        FIND_SESSION_P2P_QUERY,
        { ocpiSessionId: 'sess-001', tenantPartnerId: 42 },
      );
      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
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

    it('should update by pk when an existing row is found', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Sessions: [{ id: 99 }] })
        .mockResolvedValueOnce({ update_Sessions_by_pk: mockDbRow });

      const result = await service.upsertSession(
        mockOcpiSession,
        1,
        42,
        mockTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        UPDATE_SESSION_BY_PK_MUTATION,
        expect.objectContaining({
          id: 99,
          set: expect.objectContaining({ kwh: 12.5, status: 'ACTIVE' }),
        }),
      );
      expect(result.id).toBe('sess-001');
    });

    it('should throw when the insert returns null', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Sessions: [] })
        .mockResolvedValueOnce({ insert_Sessions_one: null });

      await expect(
        service.upsertSession(mockOcpiSession, 1, 42, mockTenantPartner),
      ).rejects.toThrow('Insert failed');
    });

    it('should throw when the partner matches neither the session nor a roaming partner', async () => {
      const foreignPartner = {
        id: 42,
        countryCode: 'DE',
        partyId: 'XXX',
        roamingPartners: [],
      } as any;

      await expect(
        service.upsertSession(mockOcpiSession, 1, 42, foreignPartner),
      ).rejects.toThrow(
        'Tenant partner does not match session or roaming partner not found',
      );
      expect(mockGraphqlClient.request).not.toHaveBeenCalled();
    });
  });

  describe('patchSession (Receiver PATCH)', () => {
    it('should patch by pk and return the updated session', async () => {
      const updatedRow = {
        ...mockDbRow,
        kwh: 25.0,
        status: 'COMPLETED',
        endDateTime: '2024-06-15T12:00:00.000Z',
      };
      mockGraphqlClient.request
        // 1. getSessionByOcpiId — the merge read
        .mockResolvedValueOnce({ Sessions: [mockDbRow] })
        // 2. resolve the DB pk
        .mockResolvedValueOnce({ Sessions: [{ id: 1 }] })
        // 3. the update itself
        .mockResolvedValueOnce({ update_Sessions_by_pk: updatedRow });

      const result = await service.patchSession(
        'FR',
        'TMS',
        'sess-001',
        42,
        {
          kwh: 25.0,
          status: 'COMPLETED' as any,
          last_updated: new Date('2024-06-15T12:00:00Z'),
        },
        mockTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        FIND_SESSION_P2P_QUERY,
        { ocpiSessionId: 'sess-001', tenantPartnerId: 42 },
      );
      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        3,
        UPDATE_SESSION_BY_PK_MUTATION,
        expect.objectContaining({
          id: 1,
          set: expect.objectContaining({
            kwh: 25.0,
            status: 'COMPLETED',
            lastUpdated: '2024-06-15T12:00:00.000Z',
          }),
        }),
      );
      expect(result.kwh).toBe(25.0);
    });

    it('should append incoming charging_periods to the existing ones', async () => {
      const existingPeriod = {
        start_date_time: '2024-06-15T10:00:00.000Z',
        dimensions: [{ type: 'ENERGY', volume: 5 }],
      };
      const incomingPeriod = {
        start_date_time: '2024-06-15T11:00:00.000Z',
        dimensions: [{ type: 'ENERGY', volume: 7 }],
      };
      mockGraphqlClient.request
        .mockResolvedValueOnce({
          Sessions: [{ ...mockDbRow, chargingPeriods: [existingPeriod] }],
        })
        .mockResolvedValueOnce({ Sessions: [{ id: 1 }] })
        .mockResolvedValueOnce({ update_Sessions_by_pk: mockDbRow });

      await service.patchSession(
        'FR',
        'TMS',
        'sess-001',
        42,
        {
          charging_periods: [incomingPeriod] as any,
          last_updated: new Date('2024-06-15T12:00:00Z'),
        },
        mockTenantPartner,
      );

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        3,
        UPDATE_SESSION_BY_PK_MUTATION,
        expect.objectContaining({
          set: expect.objectContaining({
            chargingPeriods: [existingPeriod, incomingPeriod],
          }),
        }),
      );
    });

    it('should throw when session is not found', async () => {
      mockGraphqlClient.request.mockResolvedValue({ Sessions: [] });

      await expect(
        service.patchSession(
          'FR',
          'TMS',
          'nonexistent',
          42,
          { kwh: 10, last_updated: new Date() },
          mockTenantPartner,
        ),
      ).rejects.toThrow('Session nonexistent not found for FR/TMS');
    });
  });
});
