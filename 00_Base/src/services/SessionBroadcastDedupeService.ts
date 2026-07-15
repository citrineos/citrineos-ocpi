import { Service } from 'typedi';
import { Logger, type ILogObj } from 'tslog';
import type { Session } from '../model/Session.js';
import { HttpMethod } from '@zetra/citrineos-base';

type DedupeKey = string; // `${transactionId}:${partnerId}:${method}`

@Service()
export class SessionBroadcastDedupeService {
  private readonly lastFingerprint = new Map<DedupeKey, string>();
  private readonly inFlight = new Set<DedupeKey>();

  constructor(private readonly logger: Logger<ILogObj>) {}

  private key(
    transactionId: string,
    partnerId: number,
    method: HttpMethod,
  ): DedupeKey {
    return `${transactionId}:${partnerId}:${method}`;
  }

  fingerprint(body: Partial<Session>): string {
    const lastPeriod = body.charging_periods?.at(-1);
    return [
      body.status ?? '',
      body.last_updated instanceof Date
        ? body.last_updated.toISOString()
        : String(body.last_updated ?? ''),
      (body.kwh ?? 0).toFixed(4),
      body.end_date_time instanceof Date
        ? body.end_date_time.toISOString()
        : String(body.end_date_time ?? 'null'),
      body.charging_periods?.length ?? 0,
      lastPeriod?.start_date_time instanceof Date
        ? lastPeriod.start_date_time.toISOString()
        : String(lastPeriod?.start_date_time ?? ''),
      // optional: hash dimension volumes of last period
    ].join('|');
  }

  shouldBroadcast(
    transactionId: string,
    partnerId: number,
    method: HttpMethod,
    body: Partial<Session>,
  ): boolean {
    const k = this.key(transactionId, partnerId, method);
    const fp = this.fingerprint(body);

    if (this.inFlight.has(k)) {
      this.logger.debug('Session broadcast skipped (in flight)', { k });
      return false;
    }
    if (this.lastFingerprint.get(k) === fp) {
      this.logger.debug('Session broadcast skipped (duplicate fingerprint)', {
        k,
        fp,
      });
      return false;
    }
    return true;
  }

  markInFlight(
    transactionId: string,
    partnerId: number,
    method: HttpMethod,
  ): void {
    this.inFlight.add(this.key(transactionId, partnerId, method));
  }

  markSent(
    transactionId: string,
    partnerId: number,
    method: HttpMethod,
    body: Partial<Session>,
  ): void {
    const k = this.key(transactionId, partnerId, method);
    this.lastFingerprint.set(k, this.fingerprint(body));
    this.inFlight.delete(k);
  }

  markFailed(
    transactionId: string,
    partnerId: number,
    method: HttpMethod,
  ): void {
    this.inFlight.delete(this.key(transactionId, partnerId, method));
  }

  clear(transactionId: string): void {
    for (const k of this.lastFingerprint.keys()) {
      if (k.startsWith(`${transactionId}:`)) {
        this.lastFingerprint.delete(k);
      }
    }
    for (const k of this.inFlight) {
      if (k.startsWith(`${transactionId}:`)) {
        this.inFlight.delete(k);
      }
    }
  }
}
