// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Get: 'GET',
    Post: 'POST',
    Put: 'PUT',
    Patch: 'PATCH',
    Delete: 'DELETE',
  },
}));

jest.mock('../../mapper/index', () => ({
  CdrMapper: class CdrMapperStub {},
}));

// util/helpers -> index.ts -> KoaServer -> json-schema-faker (ESM-only, unresolvable
// under Jest's CJS runtime). Neither insertSentCdr nor markCdrAsSent (the methods under
// test here) call findThenUpsert/getRoamingPartner, so stubs are sufficient.
jest.mock('../../util/helpers', () => ({
  findThenUpsert: jest.fn(),
  getRoamingPartner: jest.fn(),
}));

import { CdrsService } from '../CdrsService';
import {
  FIND_SENT_CDR_QUERY,
  INSERT_CDR_MUTATION,
  UPDATE_CDR_SENT_STATUS_MUTATION,
} from '../../graphql/queries/cdr.queries';

describe('CdrsService CDR persistence', () => {
  let service: CdrsService;
  let mockGraphqlClient: { request: jest.Mock };
  let mockLogger: any;

  const toTenantPartner = { id: 42, countryCode: 'FR', partyId: 'EMS' } as any;

  const cdr = {
    id: 'CDR-001',
    country_code: 'FR',
    party_id: 'CPO',
    start_date_time: '2026-01-01T10:00:00Z',
    end_date_time: '2026-01-01T11:00:00Z',
    session_id: 'tx-1',
    cdr_token: { uid: 'TOKEN001', type: 'RFID' },
    auth_method: 'WHITELIST',
    cdr_location: { id: 'LOC1' },
    currency: 'EUR',
    charging_periods: [{ start_date_time: '2026-01-01T10:00:00Z' }],
    total_cost: { excl_vat: 10, incl_vat: 12 },
    total_energy: 20,
    total_time: 1,
    last_updated: '2026-01-01T11:00:01Z',
  };

  const ctx = { tenantId: 7, roamingPartnerId: 5, transactionId: 99 };

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    mockGraphqlClient = { request: jest.fn() };
    // CdrsService constructor: (logger, ocpiGraphqlClient, cdrMapper, cdrsClientApi)
    service = new CdrsService(
      mockLogger,
      mockGraphqlClient as any,
      {} as any,
      {} as any,
    );
  });

  describe('insertSentCdr', () => {
    it('throws when the target tenant partner has no id', async () => {
      await expect(
        service.insertSentCdr({ countryCode: 'FR' } as any, cdr, ctx),
      ).rejects.toThrow('Tenant partner not found');
      expect(mockGraphqlClient.request).not.toHaveBeenCalled();
    });

    it('looks up an existing CDR by (ocpiCdrId, toTenantPartnerId) first', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Cdrs: [] })
        .mockResolvedValueOnce({ insert_Cdrs_one: { id: 500 } });

      await service.insertSentCdr(toTenantPartner, cdr, ctx);

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        1,
        FIND_SENT_CDR_QUERY,
        {
          ocpiCdrId: 'CDR-001',
          toTenantPartnerId: 42,
        },
      );
    });

    // Guards against duplicate rows when a session-end event is redelivered.
    it('returns the existing row id and does NOT insert when already stored', async () => {
      mockGraphqlClient.request.mockResolvedValueOnce({ Cdrs: [{ id: 321 }] });

      const result = await service.insertSentCdr(toTenantPartner, cdr, ctx);

      expect(result).toBe(321);
      expect(mockGraphqlClient.request).toHaveBeenCalledTimes(1); // no insert
    });

    it('inserts with OCPI snake_case mapped to DB columns and returns the new id', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Cdrs: [] })
        .mockResolvedValueOnce({ insert_Cdrs_one: { id: 500 } });

      const result = await service.insertSentCdr(toTenantPartner, cdr, ctx);

      expect(result).toBe(500);
      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        INSERT_CDR_MUTATION,
        {
          object: expect.objectContaining({
            ocpiCdrId: 'CDR-001',
            countryCode: 'FR',
            partyId: 'CPO',
            startDateTime: '2026-01-01T10:00:00Z',
            endDateTime: '2026-01-01T11:00:00Z',
            sessionId: 'tx-1',
            currency: 'EUR',
            totalEnergy: 20,
            tenantId: 7,
            toTenantPartnerId: 42,
            roamingPartnerId: 5,
            transactionId: 99,
          }),
        },
      );
    });

    it('nulls absent optional fields rather than leaving them undefined', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Cdrs: [] })
        .mockResolvedValueOnce({ insert_Cdrs_one: { id: 500 } });

      await service.insertSentCdr(toTenantPartner, cdr, ctx);

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        INSERT_CDR_MUTATION,
        {
          object: expect.objectContaining({
            meterId: null,
            tariffs: null,
            signedData: null,
            remark: null,
            invoiceReferenceId: null,
          }),
        },
      );
    });

    it('defaults roamingPartnerId and transactionId to null when omitted', async () => {
      mockGraphqlClient.request
        .mockResolvedValueOnce({ Cdrs: [] })
        .mockResolvedValueOnce({ insert_Cdrs_one: { id: 500 } });

      await service.insertSentCdr(toTenantPartner, cdr, { tenantId: 7 });

      expect(mockGraphqlClient.request).toHaveBeenNthCalledWith(
        2,
        INSERT_CDR_MUTATION,
        {
          object: expect.objectContaining({
            roamingPartnerId: null,
            transactionId: null,
          }),
        },
      );
    });
  });

  describe('markCdrAsSent', () => {
    it('stamps successfullySentAt on the given row', async () => {
      mockGraphqlClient.request.mockResolvedValueOnce({});

      await service.markCdrAsSent(500, '2026-01-01T11:00:05Z');

      expect(mockGraphqlClient.request).toHaveBeenCalledWith(
        UPDATE_CDR_SENT_STATUS_MUTATION,
        {
          id: 500,
          successfullySentAt: '2026-01-01T11:00:05Z',
        },
      );
    });
  });
});
