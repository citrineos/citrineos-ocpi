// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

<<<<<<< HEAD
import {
  logDbBroadcast,
  ModuleId,
  Role,
  type TenantPartnersListQueryResult,
} from '../index.js';
=======
import { logDbBroadcast, Role, type IDtoEventContext } from '../index.js';
import type { TenantDto, TenantPartnerDto } from '@zetra/citrineos-base';
>>>>>>> 331a6db (feat: tariff upsert for hub)
import { Logger } from 'tslog';
import type { ILogObj } from 'tslog';

type BroadcastPartner = TenantPartnersListQueryResult['TenantPartners'][number];

export const shouldBroadcastToPartner = (
  tenantPartner: BroadcastPartner | undefined,
  moduleId: ModuleId,
  logger: Logger<ILogObj>,
) => {
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
