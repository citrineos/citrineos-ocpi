// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { Session } from '../model/Session.js';
import type { SessionDbRow } from '../graphql/operations.js';

export class ReceivedSessionMapper {
  /**
   * Maps an incoming OCPI Session to a DB insert/upsert input.
   */
  public static mapFromOcpi(
    session: Session,
    tenantId: number,
    tenantPartnerId: number,
    roamingPartnerId: number | null,
  ): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
      ocpiSessionId: session.id,
      countryCode: session.country_code,
      partyId: session.party_id,
      startDateTime: new Date(session.start_date_time).toISOString(),
      endDateTime: session.end_date_time
        ? new Date(session.end_date_time).toISOString()
        : null,
      kwh: session.kwh,
      cdrToken: session.cdr_token,
      authMethod: session.auth_method,
      authorizationReference: session.authorization_reference ?? null,
      locationId: session.location_id,
      evseUid: session.evse_uid,
      connectorId: session.connector_id,
      meterId: session.meter_id ?? null,
      currency: session.currency,
      chargingPeriods: session.charging_periods ?? null,
      totalCost: session.total_cost ?? null,
      status: session.status,
      lastUpdated: new Date(session.last_updated).toISOString(),
      tenantId,
      tenantPartnerId,
      ...(roamingPartnerId != null && { roamingPartnerId }),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Maps a DB row back to an OCPI Session object.
   */
  public static mapToOcpi(row: SessionDbRow): Session {
    return {
      country_code: row.countryCode,
      party_id: row.partyId,
      id: row.ocpiSessionId,
      start_date_time: new Date(row.startDateTime),
      end_date_time: row.endDateTime ? new Date(row.endDateTime) : null,
      kwh: Number(row.kwh),
      cdr_token: row.cdrToken,
      auth_method: row.authMethod as Session['auth_method'],
      authorization_reference: row.authorizationReference ?? null,
      location_id: row.locationId,
      evse_uid: row.evseUid,
      connector_id: row.connectorId,
      meter_id: row.meterId ?? null,
      currency: row.currency,
      charging_periods: row.chargingPeriods ?? null,
      total_cost: row.totalCost ?? null,
      status: row.status as Session['status'],
      last_updated: new Date(row.lastUpdated),
    };
  }

  /**
   * Maps partial OCPI Session fields (PATCH) to a DB _set input.
   */
  public static mapPartialFromOcpi(
    partial: Partial<Session>,
  ): Record<string, unknown> {
    const set: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (partial.start_date_time !== undefined)
      set.startDateTime = new Date(partial.start_date_time).toISOString();
    if (partial.end_date_time !== undefined)
      set.endDateTime = partial.end_date_time
        ? new Date(partial.end_date_time).toISOString()
        : null;
    if (partial.kwh !== undefined) set.kwh = partial.kwh;
    if (partial.cdr_token !== undefined) set.cdrToken = partial.cdr_token;
    if (partial.auth_method !== undefined) set.authMethod = partial.auth_method;
    if (partial.authorization_reference !== undefined)
      set.authorizationReference = partial.authorization_reference;
    if (partial.location_id !== undefined) set.locationId = partial.location_id;
    if (partial.evse_uid !== undefined) set.evseUid = partial.evse_uid;
    if (partial.connector_id !== undefined)
      set.connectorId = partial.connector_id;
    if (partial.meter_id !== undefined) set.meterId = partial.meter_id;
    if (partial.currency !== undefined) set.currency = partial.currency;
    if (partial.charging_periods !== undefined)
      set.chargingPeriods = partial.charging_periods;
    if (partial.total_cost !== undefined) set.totalCost = partial.total_cost;
    if (partial.status !== undefined) set.status = partial.status;
    if (partial.last_updated !== undefined)
      set.lastUpdated = new Date(partial.last_updated).toISOString();

    return set;
  }
}
