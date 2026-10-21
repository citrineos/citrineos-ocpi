// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// The mapper barrel pulls in RegistrationMapper -> 00_Base/src/index.ts -> KoaServer
// -> json-schema-faker (ESM-only exports map, unresolvable under Jest's CJS runtime).
// We inject a mock SessionMapper anyway, so stub the barrel entirely.
// Same workaround as 00_Base/src/services/__tests__/TokensService.test.ts.
jest.mock('../../mapper/index', () => ({
  SessionMapper: class SessionMapperStub {},
}));

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

import { SessionBroadcaster } from '../SessionBroadcaster.js';
import { ModuleId } from '../../model/ModuleId.js';
import { InterfaceRole } from '../../model/InterfaceRole.js';
import { HttpMethod } from '@zetra/citrineos-base';

jest.mock('../../util/helpers.js', () => ({
  getOcpiToFromAuthorization: jest.fn().mockReturnValue({
    ocpiToCountryCode: 'FR',
    ocpiToPartyId: 'CPO',
  }),
  isGirevePartner: jest.fn().mockReturnValue(false),
  tokenOwnerPartnerFilter: jest.fn(
    (id: number) => (p: { id: number }) => p.id === id,
  ),
}));

describe('SessionBroadcaster', () => {
  let broadcaster: SessionBroadcaster;
  let mockLogger: any;
  let mockSessionsClientApi: { broadcastToClients: jest.Mock };
  let mockSessionMapper: {
    mapTransactionToSession: jest.Mock;
    mapIncrementalSessionPatch: jest.Mock;
  };
  let mockDedupeService: {
    shouldBroadcast: jest.Mock;
    markInFlight: jest.Mock;
    markSent: jest.Mock;
    markFailed: jest.Mock;
    clear: jest.Mock;
  };

  const tenant = { countryCode: 'FR', partyId: 'ZET' } as any;
  const transactionDto = {
    transactionId: 'tx-1',
    authorization: { tenantPartner: { id: 42 } },
  } as any;

  beforeEach(() => {
    mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() };
    mockSessionsClientApi = {
      broadcastToClients: jest.fn().mockResolvedValue([]),
    };
    mockSessionMapper = {
      mapTransactionToSession: jest
        .fn()
        .mockResolvedValue({ id: 'tx-1', status: 'ACTIVE' }),
      mapIncrementalSessionPatch: jest
        .fn()
        .mockResolvedValue({ status: 'ACTIVE' }),
    };
    mockDedupeService = {
      shouldBroadcast: jest.fn().mockReturnValue(true),
      markInFlight: jest.fn(),
      markSent: jest.fn(),
      markFailed: jest.fn(),
      clear: jest.fn(),
    };

    broadcaster = new SessionBroadcaster(
      mockLogger,
      mockSessionsClientApi as any,
      mockSessionMapper as any,
      mockDedupeService as any,
    );
  });

  describe('broadcastPutSession', () => {
    it('skips entirely when there is no token-owner partner', async () => {
      await broadcaster.broadcastPutSession(tenant, transactionDto, null);
      expect(mockSessionsClientApi.broadcastToClients).not.toHaveBeenCalled();
    });

    it('sends a PUT with the mapped session and correct path', async () => {
      await broadcaster.broadcastPutSession(tenant, transactionDto, 42);

      expect(mockSessionsClientApi.broadcastToClients).toHaveBeenCalledWith(
        expect.objectContaining({
          cpoCountryCode: 'FR',
          cpoPartyId: 'ZET',
          moduleId: ModuleId.Sessions,
          interfaceRole: InterfaceRole.RECEIVER,
          httpMethod: HttpMethod.Put,
          body: { id: 'tx-1', status: 'ACTIVE' },
          path: '/FR/ZET/tx-1',
        }),
      );
      expect(mockDedupeService.markSent).toHaveBeenCalled();
    });

    it('does not call broadcastToClients when the dedupe service says skip', async () => {
      mockDedupeService.shouldBroadcast.mockReturnValue(false);
      await broadcaster.broadcastPutSession(tenant, transactionDto, 42);
      expect(mockSessionsClientApi.broadcastToClients).not.toHaveBeenCalled();
    });

    it('marks the dedupe entry failed and rethrows when the push fails', async () => {
      mockSessionsClientApi.broadcastToClients.mockRejectedValueOnce(
        new Error('boom'),
      );
      await expect(
        broadcaster.broadcastPutSession(tenant, transactionDto, 42),
      ).rejects.toThrow('boom');
      expect(mockDedupeService.markFailed).toHaveBeenCalled();
    });
  });

  describe('broadcastPatchSession', () => {
    it('sends both a PATCH (non-Gireve) and a PUT (Gireve) call', async () => {
      await broadcaster.broadcastPatchSession(tenant, transactionDto, 42);

      const calls = mockSessionsClientApi.broadcastToClients.mock.calls.map(
        (c) => c[0].httpMethod,
      );
      expect(calls).toEqual(
        expect.arrayContaining([HttpMethod.Patch, HttpMethod.Put]),
      );
    });
  });
});
