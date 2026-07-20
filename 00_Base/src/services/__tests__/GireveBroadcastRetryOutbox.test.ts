// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Container } from 'typedi';
import type { Logger } from 'tslog';
import { InterfaceRole } from '../../model/InterfaceRole';
import { ModuleId } from '../../model/ModuleId';
import { OcpiConfigToken } from '../../config/ocpi.types';
import { GireveBroadcastRetryOutbox } from '../GireveBroadcastRetryOutbox';

jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Patch: 'PATCH',
    Put: 'PUT',
  },
}));

const { HttpMethod } = require('@zetra/citrineos-base');

describe('GireveBroadcastRetryOutbox', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    Container.set(OcpiConfigToken, {
      gireve: {
        retryIntervalSeconds: 300,
        retryBatchSize: 50,
        retryStaleLockSeconds: 900,
      },
    } as any);
  });

  it('inserts a new row when no dedupe match exists', async () => {
    const mockOcpiGraphqlClient = {
      request: jest
        .fn()
        .mockResolvedValueOnce({ GireveBroadcastRetryQueues: [] })
        .mockResolvedValueOnce({ insert_GireveBroadcastRetryQueues_one: { id: 'new' } }),
    };

    const outbox = new GireveBroadcastRetryOutbox(
      mockOcpiGraphqlClient as any,
      mockLogger as any,
    );

    await outbox.upsertOnFailure({
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
      lastError: 'non-2xx',
    });

    expect(mockOcpiGraphqlClient.request).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Gireve retry outbox: inserted pending retry',
      expect.objectContaining({
        resourceId: 'sess-001',
        partnerTenantPartnerId: 7,
      }),
    );
  });

  it('refreshes payload on dedupe without incrementing attemptCount', async () => {
    const mockOcpiGraphqlClient = {
      request: jest
        .fn()
        .mockResolvedValueOnce({
          GireveBroadcastRetryQueues: [{ id: 'existing-id' }],
        })
        .mockResolvedValueOnce({
          update_GireveBroadcastRetryQueues_by_pk: { id: 'existing-id' },
        }),
    };

    const outbox = new GireveBroadcastRetryOutbox(
      mockOcpiGraphqlClient as any,
      mockLogger as any,
    );

    await outbox.upsertOnFailure({
      partnerTenantPartnerId: 7,
      cpoCountryCode: 'FR',
      cpoPartyId: 'ZET',
      moduleId: ModuleId.Tariffs,
      interfaceRole: InterfaceRole.RECEIVER,
      httpMethod: HttpMethod.Put,
      resourceType: 'tariff',
      resourceId: 'tariff-42',
      payload: { id: 'tariff-42', currency: 'EUR' },
      lastError: 'timeout',
    });

    expect(mockOcpiGraphqlClient.request).toHaveBeenCalledTimes(2);
    const updateCall = mockOcpiGraphqlClient.request.mock.calls[1];
    expect(updateCall[1]).toEqual(
      expect.objectContaining({
        id: 'existing-id',
        lastError: 'timeout',
        payload: { id: 'tariff-42', currency: 'EUR' },
      }),
    );
    expect(updateCall[1]).not.toHaveProperty('attemptCount');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Gireve retry outbox: refreshed pending retry payload (dedupe)',
      expect.objectContaining({
        id: 'existing-id',
        resourceId: 'tariff-42',
      }),
    );
  });

  it('claims due retries via the SQL claim function', async () => {
    const mockOcpiGraphqlClient = {
      request: jest.fn().mockResolvedValue({
        claim_gireve_broadcast_retries: [
          { id: 'claimed-1', resourceId: 'sess-001', attemptCount: 1 },
        ],
      }),
    };

    const outbox = new GireveBroadcastRetryOutbox(
      mockOcpiGraphqlClient as any,
      mockLogger as any,
    );

    const items = await outbox.claimDueRetries(10);

    expect(items).toHaveLength(1);
    expect(mockOcpiGraphqlClient.request).toHaveBeenCalledWith(
      expect.anything(),
      { batchLimit: 10 },
    );
  });

  it('releases stale processing locks', async () => {
    const mockOcpiGraphqlClient = {
      request: jest.fn().mockResolvedValue({
        update_GireveBroadcastRetryQueues: { affected_rows: 2 },
      }),
    };

    const outbox = new GireveBroadcastRetryOutbox(
      mockOcpiGraphqlClient as any,
      mockLogger as any,
    );

    const released = await outbox.releaseStaleLocks();

    expect(released).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Gireve retry outbox: released stale processing locks',
      expect.objectContaining({ released: 2 }),
    );
  });
});
