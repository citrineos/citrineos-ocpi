// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import https from 'node:https';
import { RestClient } from 'typed-rest-client';
import { Inject, Service } from 'typedi';
import { MtlsAgentRequestHandler } from './MtlsAgentRequestHandler.js';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import type { OcpiConfig } from '../config/ocpi.types.js';
import { OcpiConfigToken } from '../config/ocpi.types.js';

const DEFAULT_CACHE_TTL_SECONDS = 900;

export interface PartnerMtlsSecretPayload {
  certificate: string;
  private_key: string;
  ca?: string;
}

interface CacheEntry {
  agent: https.Agent;
  expiresAt: number;
}

@Service()
export class PartnerMtlsCertificateService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<https.Agent>>();
  private readonly restClientCache = new Map<string, RestClient>();
  private secretsManagerClient: SecretsManagerClient | undefined;

  @Inject()
  protected logger!: Logger<ILogObj>;

  constructor(@Inject(OcpiConfigToken) private readonly config: OcpiConfig) {}

  /**
   * Returns an https.Agent configured for mutual TLS, or undefined when ARN is empty.
   */
  async getAgent(
    awsSecretCertificateArn: string | null | undefined,
  ): Promise<https.Agent | undefined> {
    if (!awsSecretCertificateArn?.trim()) {
      return undefined;
    }
    const arn = awsSecretCertificateArn.trim();
    const now = Date.now();
    const cached = this.cache.get(arn);
    if (cached && cached.expiresAt > now) {
      return cached.agent;
    }

    const existing = this.inflight.get(arn);
    if (existing) {
      return existing;
    }

    const fetchPromise = this.fetchAndBuildAgent(arn);
    this.inflight.set(arn, fetchPromise);
    try {
      const agent = await fetchPromise;
      const ttlMs = this.getCacheTtlMs();
      this.cache.set(arn, { agent, expiresAt: now + ttlMs });
      return agent;
    } finally {
      this.inflight.delete(arn);
    }
  }

  /**
   * Returns a RestClient that presents the partner client certificate for mTLS.
   */
  async getRestClient(
    awsSecretCertificateArn: string,
    userAgent: string,
  ): Promise<RestClient> {
    const arn = awsSecretCertificateArn.trim();
    const cacheKey = `${arn}:${userAgent}`;
    const cached = this.restClientCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const agent = await this.getAgent(arn);
    if (!agent) {
      throw new Error(`No mTLS agent available for secret ARN: ${arn}`);
    }
    const client = new RestClient(userAgent, undefined, [
      new MtlsAgentRequestHandler(agent),
    ]);
    this.restClientCache.set(cacheKey, client);
    return client;
  }

  /** Clears cached agents and RestClients (e.g. for tests). */
  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
    this.restClientCache.clear();
  }

  private getCacheTtlMs(): number {
    const seconds =
      this.config.mtls?.secretCacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
    return seconds * 1000;
  }

  private getSecretsManagerClient(): SecretsManagerClient {
    if (!this.secretsManagerClient) {
      const region =
        this.config.mtls?.awsRegion ?? process.env.AWS_REGION ?? undefined;
      this.secretsManagerClient = new SecretsManagerClient(
        region ? { region } : {},
      );
    }
    return this.secretsManagerClient;
  }

  private async fetchAndBuildAgent(arn: string): Promise<https.Agent> {
    try {
      const response = await this.getSecretsManagerClient().send(
        new GetSecretValueCommand({ SecretId: arn }),
      );
      if (!response.SecretString) {
        throw new Error(
          `Secret ${arn} has no SecretString (binary secrets are not supported)`,
        );
      }
      const payload = this.parseSecretPayload(response.SecretString, arn);
      return new https.Agent({
        cert: payload.certificate,
        key: payload.private_key,
        ca: payload.ca,
        rejectUnauthorized: true,
      });
    } catch (error) {
      this.logger.error('Failed to load partner mTLS certificate from AWS', {
        secretArn: arn,
        error,
      });
      throw error;
    }
  }

  parseSecretPayload(
    secretString: string,
    arn: string,
  ): PartnerMtlsSecretPayload {
    let parsed: unknown;
    try {
      parsed = JSON.parse(secretString);
    } catch {
      throw new Error(`Secret ${arn} is not valid JSON`);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Secret ${arn} must be a JSON object`);
    }
    const record = parsed as Record<string, unknown>;
    const certificate = record.certificate;
    const privateKey = record.private_key;
    if (typeof certificate !== 'string' || !certificate.trim()) {
      throw new Error(
        `Secret ${arn} must include a non-empty "certificate" field`,
      );
    }
    if (typeof privateKey !== 'string' || !privateKey.trim()) {
      throw new Error(
        `Secret ${arn} must include a non-empty "private_key" field`,
      );
    }
    const ca = record.ca;
    return {
      certificate: certificate.trim(),
      private_key: privateKey.trim(),
      ca: typeof ca === 'string' && ca.trim() ? ca.trim() : undefined,
    };
  }
}
