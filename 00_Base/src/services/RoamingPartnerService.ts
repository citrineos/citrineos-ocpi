// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { Service } from 'typedi';
import { OcpiLogger } from '../util/OcpiLogger.js';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient.js';

import type {
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetRoamingPartnerByIdentityQueryVariables,
  GetRoamingPartnerByIdentityQueryResult,
  SetRoamingPartnerRolesMutationVariables,
  SetRoamingPartnerRolesMutationResult,
  OnboardRoamingPartnerBody,
  CreateRoamingPartnerMutationVariables,
  CreateRoamingPartnerMutationResult,
} from '../index.js';
import { GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY } from '../graphql/queries/tenantPartner.queries.js';
import {
  CREATE_ROAMING_PARTNER,
  GET_ROAMING_PARTNER_BY_IDENTITY,
  SET_ROAMING_PARTNER_ROLES,
} from '../graphql/queries/roamingPartner.queries.js';
import { NotFoundException } from '../exception/NotFoundException.js';
import { InvalidParamException } from '../exception/InvalidParamException.js';
import { OnboardRoamingPartnerBodySchema } from '../model/DTO/OnboardRoamingPartnerBody.js';

export type RoamingPartnerRole = 'CPO' | 'EMSP';

export type UpsertRoamingPartnerResult = {
  id: number;
  // The hub's TenantPartner the roaming partner sits behind.
  tenantPartnerId: number;
  outcome: 'created' | 'role_added' | 'unchanged';
};

// Hasura returns `date` as YYYY-MM-DD; the body accepts any string.
const toDateOnly = (value: string) => value.slice(0, 10);

@Service()
export class RoamingPartnerService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  /**
   * Idempotent create: inserts the roaming partner with `role`, or adds `role`
   * to an existing row. Rejects if the row exists with a different name or
   * contract dates, so a role add never overwrites contract data.
   */
  async upsertRoamingPartner(
    rawBody: OnboardRoamingPartnerBody,
    role: RoamingPartnerRole,
  ): Promise<UpsertRoamingPartnerResult> {
    // BodyWithSchema only feeds the OpenAPI spec, it does not validate requests.
    const parsed = OnboardRoamingPartnerBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new InvalidParamException(
        parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      );
    }
    const body = parsed.data;
    const {
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
      roamingPartnerName,
      roamingPartnerSignatureDate,
      roamingPartnerContractStartDate,
    } = body;

    const tenantPartnerResult = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY, {
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
    });
    const tenantPartner = tenantPartnerResult.TenantPartners[0];
    if (!tenantPartner) {
      throw new NotFoundException('Tenant partner not found');
    }

    const existingResult = await this.ocpiGraphqlClient.request<
      GetRoamingPartnerByIdentityQueryResult,
      GetRoamingPartnerByIdentityQueryVariables
    >(GET_ROAMING_PARTNER_BY_IDENTITY, {
      tenantPartnerId: tenantPartner.id,
      countryCode: roamingPartnerCountryCode,
      partyId: roamingPartnerPartyId,
    });
    const existing = existingResult.RoamingPartners[0];

    if (!existing) {
      const created = await this.ocpiGraphqlClient.request<
        CreateRoamingPartnerMutationResult,
        CreateRoamingPartnerMutationVariables
      >(CREATE_ROAMING_PARTNER, {
        countryCode: roamingPartnerCountryCode,
        partyId: roamingPartnerPartyId,
        tenantPartnerId: tenantPartner.id,
        name: roamingPartnerName,
        signatureDate: roamingPartnerSignatureDate,
        contractStartDate: roamingPartnerContractStartDate,
        roles: [role],
      });
      const id = created.insert_RoamingPartners_one?.id;
      if (!id) {
        this.logger.error('Roaming partner insert returned no id');
        throw new Error('Failed to create roaming partner');
      }
      return { id, tenantPartnerId: tenantPartner.id, outcome: 'created' };
    }

    const sameDetails =
      existing.name === roamingPartnerName &&
      existing.signatureDate === toDateOnly(roamingPartnerSignatureDate) &&
      existing.contractStartDate ===
        toDateOnly(roamingPartnerContractStartDate);
    if (!sameDetails) {
      throw new InvalidParamException(
        `Roaming partner ${roamingPartnerCountryCode}-${roamingPartnerPartyId} already exists with different name or contract dates`,
      );
    }

    const roles: RoamingPartnerRole[] = existing.roles ?? [];
    if (roles.includes(role)) {
      return {
        id: existing.id,
        tenantPartnerId: tenantPartner.id,
        outcome: 'unchanged',
      };
    }

    await this.ocpiGraphqlClient.request<
      SetRoamingPartnerRolesMutationResult,
      SetRoamingPartnerRolesMutationVariables
    >(SET_ROAMING_PARTNER_ROLES, { id: existing.id, roles: [...roles, role] });
    return {
      id: existing.id,
      tenantPartnerId: tenantPartner.id,
      outcome: 'role_added',
    };
  }
}
