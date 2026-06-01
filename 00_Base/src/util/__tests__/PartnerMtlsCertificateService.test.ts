// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetSecretValueCommand: jest
    .fn()
    .mockImplementation((input: unknown) => input),
}));

import { PartnerMtlsCertificateService } from '../PartnerMtlsCertificateService.js';
import type { OcpiConfig } from '../../config/ocpi.types.js';

const TEST_ARN = 'arn:aws:secretsmanager:eu-west-1:123:secret:test';

const baseConfig = {
  mtls: { secretCacheTtlSeconds: 900 },
} as OcpiConfig;

function createService(
  config: OcpiConfig = baseConfig,
): PartnerMtlsCertificateService {
  const service = new PartnerMtlsCertificateService(config);
  (service as any).logger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  return service;
}

describe('PartnerMtlsCertificateService', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({
      SecretString: JSON.stringify({
        certificate:
          '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----',
        private_key:
          '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----',
      }),
    });
  });

  describe('getAgent', () => {
    it('returns undefined when ARN is empty', async () => {
      const service = createService();
      expect(await service.getAgent(null)).toBeUndefined();
      expect(await service.getAgent('')).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('fetches secret and returns https.Agent', async () => {
      const service = createService();
      const agent = await service.getAgent(TEST_ARN);
      expect(agent).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('uses cache on second call with same ARN', async () => {
      const service = createService();
      await service.getAgent(TEST_ARN);
      await service.getAgent(TEST_ARN);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('refetches after cache clear', async () => {
      const service = createService();
      await service.getAgent(TEST_ARN);
      service.clearCache();
      await service.getAgent(TEST_ARN);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseSecretPayload', () => {
    it('parses certificate and private_key', () => {
      const service = createService();
      const payload = service.parseSecretPayload(
        JSON.stringify({
          certificate: 'cert-pem',
          private_key: 'key-pem',
        }),
        TEST_ARN,
      );
      expect(payload.certificate).toBe('cert-pem');
      expect(payload.private_key).toBe('key-pem');
      expect(payload.ca).toBeUndefined();
    });

    it('includes optional ca', () => {
      const service = createService();
      const payload = service.parseSecretPayload(
        JSON.stringify({
          certificate: 'cert-pem',
          private_key: 'key-pem',
          ca: 'ca-pem',
        }),
        TEST_ARN,
      );
      expect(payload.ca).toBe('ca-pem');
    });

    it('throws when required fields are missing', () => {
      const service = createService();
      expect(() =>
        service.parseSecretPayload(
          JSON.stringify({ certificate: 'x' }),
          TEST_ARN,
        ),
      ).toThrow('private_key');
    });
  });
});
