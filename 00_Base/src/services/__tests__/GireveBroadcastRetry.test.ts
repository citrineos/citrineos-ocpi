// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Container } from 'typedi';
import { InterfaceRole } from '../../model/InterfaceRole';
import { ModuleId } from '../../model/ModuleId';
import { OcpiEmptyResponseSchema } from '../../model/OcpiEmptyResponse';
import { OcpiConfigToken } from '../../config/ocpi.types';
import type { Logger } from 'tslog';

jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Get: 'GET',
    Post: 'POST',
    Put: 'PUT',
    Patch: 'PATCH',
    Delete: 'DELETE',
  },
  HttpHeader: {
    Authorization: 'Authorization',
  },
}));

jest.mock('../../util/helpers', () => ({
  shouldBroadcastToPartner: jest.fn().mockReturnValue(true),
  handleHttpMethodForPartner: jest.fn((httpMethod: unknown) => httpMethod),
  isGirevePartner: jest.fn(({ countryCode, partyId }) => {
    return countryCode === 'FR' && partyId === '007';
  }),
}));

describe('Gireve broadcast retry mechanism', () => {
  beforeEach(() => {
    Container.set(
      OcpiConfigToken,
      {
        gireve: {
          countryCode: 'FR',
          partyId: '007',
          retryIntervalSeconds: 300,
          retryBatchSize: 50,
          retryStaleLockSeconds: 900,
        },
      } as any,
    );
  });

  describe('upsertOnFailure (BaseClientApi broadcastToClients)', () => {
    it('queues a retry when a Sessions push to Gireve fails', async () => {
      const { BaseClientApi } = require('../../trigger/BaseClientApi');
      const { HttpMethod } = require('@zetra/citrineos-base');

      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as Logger<unknown>;

      const girevePartner = {
        id: 7,
        countryCode: 'FR',
        partyId: '007',
        awsSecretCertificateArn: null,
        partnerProfileOCPI: {
          roles: [{ role: 'EMSP' }],
          endpoints: [
            { identifier: 'sessions_RECEIVER', url: 'https://example.com' },
          ],
          credentials: { token: 'dummy' },
        },
      };

      const mockOcpiGraphqlClient = {
        request: jest.fn().mockResolvedValue({
          TenantPartners: [girevePartner],
        }),
      };

      const mockOutbox = {
        upsertOnFailure: jest.fn().mockResolvedValue(undefined),
      };

      class FailingClientApi extends BaseClientApi {
        // eslint-disable-next-line class-methods-use-this
        getUrl(): string {
          return 'https://example.com';
        }

        async request(): Promise<any> {
          throw new Error('non-2xx');
        }
      }

      const api = new FailingClientApi() as any;
      api.logger = mockLogger;
      api.ocpiGraphqlClient = mockOcpiGraphqlClient;
      api.partnerMtlsCertificateService = {} as any;
      api.gireveBroadcastRetryOutbox = mockOutbox;

      await api.broadcastToClients({
        cpoCountryCode: 'FR',
        cpoPartyId: 'ZET',
        moduleId: ModuleId.Sessions,
        interfaceRole: InterfaceRole.RECEIVER,
        httpMethod: HttpMethod.Patch,
        schema: OcpiEmptyResponseSchema,
        body: { id: 'sess-001' },
        path: '/FR/ZET/sess-001',
      } as any);

      expect(mockOutbox.upsertOnFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerTenantPartnerId: 7,
          moduleId: ModuleId.Sessions,
          resourceType: 'session',
          resourceId: 'sess-001',
          ocpiPath: '/FR/ZET/sess-001',
        }),
      );
    });
  });

  describe('retry runner runOnce', () => {
    it('marks the retry item as sent when the push succeeds', async () => {
      const { GireveBroadcastRetryWorker } = require('../GireveBroadcastRetryWorker');
      const { HttpMethod } = require('@zetra/citrineos-base');

      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as Logger<unknown>;

      const item = {
        id: 'uuid-1',
        partnerTenantPartnerId: 7,
        cpoCountryCode: 'FR',
        cpoPartyId: 'ZET',
        moduleId: ModuleId.Sessions,
        interfaceRole: InterfaceRole.RECEIVER,
        httpMethod: HttpMethod.Patch,
        resourceType: 'session',
        resourceId: 'sess-001',
        ocpiPath: '/FR/ZET/sess-001',
        payload: { id: 'sess-001' },
        attemptCount: 1,
        nextRetryAt: new Date().toISOString(),
      };

      const mockOutbox = {
        releaseStaleLocks: jest.fn().mockResolvedValue(0),
        claimDueRetries: jest.fn().mockResolvedValue([item]),
        markSent: jest.fn().mockResolvedValue(undefined),
        reschedule: jest.fn().mockResolvedValue(undefined),
      };

      const mockSessionsClientApi = {
        request: jest.fn().mockResolvedValue({}),
      };

      const mockCdrsClientApi = {
        request: jest.fn(),
      };

      const mockTariffsClientApi = {
        request: jest.fn(),
      };

      const mockOcpiGraphqlClient = {
        request: jest.fn().mockResolvedValue({
          TenantPartners_by_pk: {
            id: 7,
            countryCode: 'FR',
            partyId: '007',
            awsSecretCertificateArn: null,
            partnerProfileOCPI: { credentials: { token: 'dummy' } },
          },
        }),
      };

      const worker = new GireveBroadcastRetryWorker(
        mockOutbox as any,
        mockLogger as any,
        mockSessionsClientApi as any,
        mockCdrsClientApi as any,
        mockTariffsClientApi as any,
        mockOcpiGraphqlClient as any,
      );

      const result = await worker.runOnce();

      expect(mockOutbox.releaseStaleLocks).toHaveBeenCalled();
      expect(mockOutbox.claimDueRetries).toHaveBeenCalled();
      expect(mockSessionsClientApi.request).toHaveBeenCalled();
      expect(mockOutbox.markSent).toHaveBeenCalledWith('uuid-1');
      expect(mockOutbox.reschedule).not.toHaveBeenCalled();
      expect(result).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        staleLocksReleased: 0,
      });
    });
  });
});
