// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { TenantPartnerDto } from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { Container } from 'typedi';

import {
  logDbBroadcast,
  ModuleId,
  OcpiConfigToken,
  Role,
  type OcpiConfig,
  type TenantPartnersListQueryResult,
} from '../index.js';

import { Logger } from 'tslog';
import type { ILogObj } from 'tslog';

import type { BroadcastParams } from '../trigger/BaseClientApi.js';
type BroadcastPartner = TenantPartnersListQueryResult['TenantPartners'][number];

export const shouldBroadcastToPartner = (
  tenantPartner: BroadcastPartner | undefined,
  moduleId: ModuleId,
  logger: Logger<ILogObj>,
) => {
  const config = Container.get<OcpiConfig>(OcpiConfigToken);

  if (!tenantPartner || !tenantPartner.countryCode || !tenantPartner.partyId) {
    logDbBroadcast(
      logger,
      'error',
      `Tenant Partner data missing, cannot broadcast.`,
    );
    return false;
  }
  const roles = tenantPartner.partnerProfileOCPI?.roles;
  if (!roles?.length) {
    logDbBroadcast(
      logger,
      'error',
      `TenantPartner ${tenantPartner.id} does not have a partner profile OCPI credentials role, cannot broadcast.`,
    );
    return false;
  }
  let requiredRole = null;

  if (moduleId === ModuleId.Tokens) {
    requiredRole = Role.CPO;
  } else {
    requiredRole = Role.EMSP;
  }

  if (!roles.some((r: any) => r.role === requiredRole || r.role === Role.HUB)) {
    logDbBroadcast(
      logger,
      'info',
      `Tenant Partner ${tenantPartner.id} is not a ${requiredRole} for module ${moduleId}, should not be broadcasted.`,
    );
    return false;
  }

  // if (
  //   moduleId !== ModuleId.Tokens &&
  //   tenantPartner.partyId === config.gireve?.partyId &&
  //   tenantPartner.countryCode === config.gireve?.countryCode
  // ) {
  //   logDbBroadcast(logger, 'info', `Broadcast as CPO to Gireve disabled`);
  //   return false;
  // }
  return true;
};

export const getRoamingPartner = (
  tenantPartner: TenantPartnerDto,
  country_code: string,
  party_id: string,
) => {
  if ((tenantPartner.roamingPartners?.length ?? 0) > 0) {
    return tenantPartner.roamingPartners?.find(
      (roamingPartner) =>
        roamingPartner.countryCode === country_code &&
        roamingPartner.partyId === party_id,
    );
  }
  return null;
};

interface SimpleGraphQLClient {
  request<T>(query: string, variables?: object): Promise<T>;
}

type WithId = { id: number };

export async function findThenUpsert<
  TResult extends WithId,
  TFindVars extends object = object,
  TInsertVars extends object = object,
  TUpdateVars extends object = object,
>(
  client: SimpleGraphQLClient,
  opts: {
    findQuery: string;
    findVars: TFindVars;
    findResultKey: string;
    insertQuery: string;
    insertVars: TInsertVars;
    insertResultKey: string;
    updateQuery: string;
    updateVars: (existingId: number) => TUpdateVars;
    updateResultKey: string;
    beforeUpdate?: (existingId: number) => Promise<void>;
  },
): Promise<TResult> {
  const findResult = await client.request<Record<string, WithId[]>>(
    opts.findQuery,
    opts.findVars,
  );
  const existing = findResult[opts.findResultKey]?.[0];

  if (!existing) {
    const insertResult = await client.request<Record<string, TResult>>(
      opts.insertQuery,
      opts.insertVars,
    );
    const inserted = insertResult[opts.insertResultKey];
    if (!inserted?.id) throw new Error('Insert failed');
    return inserted;
  }

  if (opts.beforeUpdate) {
    await opts.beforeUpdate(existing.id);
  }

  const updateResult = await client.request<Record<string, TResult>>(
    opts.updateQuery,
    opts.updateVars(existing.id),
  );
  const updated = updateResult[opts.updateResultKey];
  if (!updated?.id) throw new Error('Update failed');
  return updated;
}

export const handleHttpMethodForPartner = (
  httpMethod: HttpMethod,
  moduleId: ModuleId,
  partner: BroadcastPartner,
) => {
  const config = Container.get<OcpiConfig>(OcpiConfigToken);
  if (
    (moduleId === ModuleId.Tokens || moduleId === ModuleId.Sessions) &&
    httpMethod === HttpMethod.Patch &&
    isGirevePartner(partner)
  ) {
    return HttpMethod.Put;
  }
  return httpMethod;
};

export const isGirevePartner = (partner: {
  countryCode?: string;
  partyId?: string;
}) => {
  const config = Container.get<OcpiConfig>(OcpiConfigToken);
  return (
    partner.countryCode === config.gireve?.countryCode &&
    partner.partyId === config.gireve?.partyId
  );
};

export function tokenOwnerPartnerFilter(
  tokenOwnerTenantPartnerId: number,
): NonNullable<BroadcastParams<never>['partnerFilter']> {
  return (partner: BroadcastPartner) =>
    partner.id === tokenOwnerTenantPartnerId;
}
