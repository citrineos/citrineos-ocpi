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
  HttpHeader: { Authorization: 'Authorization' },
}));

// Mapper barrel -> RegistrationMapper -> 00_Base/src/index.ts -> KoaServer -> json-schema-faker
// (ESM-only exports map, unresolvable under Jest's CJS runtime). We inject a mock
// CdrMapper anyway. Same workaround as 00_Base/src/services/__tests__/TokensService.test.ts.
jest.mock('../../mapper/index', () => ({
  CdrMapper: class CdrMapperStub {},
}));

jest.mock('../../util/helpers', () => ({
  getOcpiToFromAuthorization: jest.fn().mockReturnValue({
    ocpiToCountryCode: 'FR',
    ocpiToPartyId: 'EMS',
  }),
  tokenOwnerPartnerFilter: jest.fn(
    (id: number) => (p: { id: number }) => p.id === id,
  ),
}));

import { CdrBroadcaster } from '../CdrBroadcaster.js';
import { ModuleId } from '../../model/ModuleId.js';
import { InterfaceRole } from '../../model/InterfaceRole.js';
import { OcpiResponseStatusCode } from '../../model/OcpiResponse.js';
import { HttpMethod } from '@zetra/citrineos-base';

const SUCCESS = { status_code: OcpiResponseStatusCode.GenericSuccessCode }; // 1000

describe('CdrBroadcaster.broadcastPostCdr', () => {
  let broadcaster: CdrBroadcaster;
  let mockLogger: any;
  let mockCdrMapper: { mapTransactionsToCdrs: jest.Mock };
  let mockCdrsClientApi: { broadcastToClients: jest.Mock };
  let mockCdrsService: { insertSentCdr: jest.Mock; markCdrAsSent: jest.Mock };

  const cdrDto = {
    id: 'CDR-001',
    country_code: 'FR',
    party_id: 'CPO',
    total_cost: { excl_vat: 10 },
  };

  const transactionDto = {
    id: 99,
    transactionId: 'tx-1',
    authorization: {
      tenantPartner: { id: 42, tenant: { id: 7 } },
      roamingPartner: { id: 5 },
    },
  } as any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    mockCdrMapper = {
      mapTransactionsToCdrs: jest.fn().mockResolvedValue([cdrDto]),
    };
    mockCdrsClientApi = {
      broadcastToClients: jest.fn().mockResolvedValue([SUCCESS]),
    };
    mockCdrsService = {
      insertSentCdr: jest.fn().mockResolvedValue(500),
      markCdrAsSent: jest.fn().mockResolvedValue(undefined),
    };

    broadcaster = new CdrBroadcaster(
      mockLogger,
      mockCdrMapper as any,
      mockCdrsClientApi as any,
      mockCdrsService as any,
    );
  });

  describe('happy path: stored, broadcast, then marked sent', () => {
    it('persists the CDR with the right tenant/roaming/transaction context', async () => {
      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.insertSentCdr).toHaveBeenCalledWith(
        transactionDto.authorization.tenantPartner,
        cdrDto,
        { tenantId: 7, roamingPartnerId: 5, transactionId: 99 },
      );
    });

    it('POSTs the CDR to the token-owner partner', async () => {
      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsClientApi.broadcastToClients).toHaveBeenCalledWith(
        expect.objectContaining({
          cpoCountryCode: 'FR', // from cdrDto.country_code, NOT the tenant
          cpoPartyId: 'CPO',
          moduleId: ModuleId.Cdrs,
          interfaceRole: InterfaceRole.RECEIVER,
          httpMethod: HttpMethod.Post,
          body: cdrDto,
          ocpiToCountryCode: 'FR',
          ocpiToPartyId: 'EMS',
        }),
      );
    });

    it('marks the stored CDR as sent using the id returned by the insert', async () => {
      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.markCdrAsSent).toHaveBeenCalledWith(
        500,
        expect.any(String),
      );
    });

    it('stores before broadcasting, and marks sent only after', async () => {
      const order: string[] = [];
      mockCdrsService.insertSentCdr.mockImplementation(async () => {
        order.push('store');
        return 500;
      });
      mockCdrsClientApi.broadcastToClients.mockImplementation(async () => {
        order.push('broadcast');
        return [SUCCESS];
      });
      mockCdrsService.markCdrAsSent.mockImplementation(async () => {
        order.push('markSent');
      });

      await broadcaster.broadcastPostCdr(transactionDto);

      expect(order).toEqual(['store', 'broadcast', 'markSent']);
    });

    it('falls back to authorization.roamingPartnerId when roamingPartner is absent', async () => {
      const tx = {
        ...transactionDto,
        authorization: {
          tenantPartner: { id: 42, tenant: { id: 7 } },
          roamingPartnerId: 8,
        },
      };

      await broadcaster.broadcastPostCdr(tx);

      expect(mockCdrsService.insertSentCdr).toHaveBeenCalledWith(
        expect.anything(),
        cdrDto,
        expect.objectContaining({ roamingPartnerId: 8 }),
      );
    });
  });

  describe('not-delivered cases: stored but NOT marked sent', () => {
    // OCPI-level failure despite HTTP 200 — the case a status-code-only check would miss.
    it('does not mark sent when the partner returns a non-1000 status_code', async () => {
      mockCdrsClientApi.broadcastToClients.mockResolvedValueOnce([
        { status_code: 2001 },
      ]);

      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.insertSentCdr).toHaveBeenCalledTimes(1);
      expect(mockCdrsService.markCdrAsSent).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    // Happens when partnerFilter excludes every partner — nothing actually went out.
    it('does not mark sent when no partner responded', async () => {
      mockCdrsClientApi.broadcastToClients.mockResolvedValueOnce([]);

      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.markCdrAsSent).not.toHaveBeenCalled();
    });

    it('does not mark sent when more than one partner responded', async () => {
      mockCdrsClientApi.broadcastToClients.mockResolvedValueOnce([
        SUCCESS,
        SUCCESS,
      ]);

      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.markCdrAsSent).not.toHaveBeenCalled();
    });

    it('swallows a broadcast failure, leaving the CDR stored and unmarked', async () => {
      mockCdrsClientApi.broadcastToClients.mockRejectedValueOnce(
        new Error('partner 500'),
      );

      await expect(
        broadcaster.broadcastPostCdr(transactionDto),
      ).resolves.toBeUndefined();
      expect(mockCdrsService.insertSentCdr).toHaveBeenCalledTimes(1);
      expect(mockCdrsService.markCdrAsSent).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    // markCdrAsSent runs inside the same try/catch as the broadcast, so if the
    // mark fails the error is swallowed: the partner HAS the CDR but the DB says
    // otherwise. Worth confirming this is intended — it invites a duplicate re-send.
    it('swallows a markCdrAsSent failure after a successful delivery', async () => {
      mockCdrsService.markCdrAsSent.mockRejectedValueOnce(
        new Error('update failed'),
      );

      await expect(
        broadcaster.broadcastPostCdr(transactionDto),
      ).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('skip paths: nothing stored, nothing broadcast', () => {
    it('does nothing when the mapper produces no CDR', async () => {
      mockCdrMapper.mapTransactionsToCdrs.mockResolvedValueOnce([]);

      await broadcaster.broadcastPostCdr(transactionDto);

      expect(mockCdrsService.insertSentCdr).not.toHaveBeenCalled();
      expect(mockCdrsClientApi.broadcastToClients).not.toHaveBeenCalled();
    });

    it('does nothing when there is no token-owner partner', async () => {
      const tx = { ...transactionDto, authorization: { tenantPartner: null } };

      await broadcaster.broadcastPostCdr(tx);

      expect(mockCdrsService.insertSentCdr).not.toHaveBeenCalled();
      expect(mockCdrsClientApi.broadcastToClients).not.toHaveBeenCalled();
    });

    // The insert is caught, logged, and rethrown — a DB failure aborts the push.
    it('logs and rethrows an insert failure without broadcasting', async () => {
      mockCdrsService.insertSentCdr.mockRejectedValueOnce(new Error('db down'));

      await expect(
        broadcaster.broadcastPostCdr(transactionDto),
      ).rejects.toThrow('db down');
      expect(mockCdrsClientApi.broadcastToClients).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
