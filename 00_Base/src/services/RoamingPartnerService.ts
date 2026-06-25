// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { Service } from 'typedi';
import { OcpiLogger } from '../index.js';
import { OcpiGraphqlClient } from '../index.js';

import type {
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  OnboardRoamingPartnerBody,
  CreateRoamingPartnerMutationVariables,
  CreateRoamingPartnerMutationResult,
} from '../index.js';
import { GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY } from '../graphql/queries/tenantPartner.queries.js';
import type { TenantDto } from '@zetra/citrineos-base/dist/interfaces/dto/tenant.dto.js';
import { CREATE_ROAMING_PARTNER } from '../graphql/queries/roamingPartner.queries.js';

@Service()
export class RoamingPartnerService {
  constructor(
    private readonly logger: OcpiLogger,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  async createRoamingPartner(
    body: OnboardRoamingPartnerBody,
  ): Promise<number | undefined> {
    const {
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
    } = body;
    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY, {
      ourCountryCode: ourCountryCode,
      ourPartyId: ourPartyId,
      partnerCountryCode: partnerCountryCode,
      partnerPartyId: partnerPartyId,
    });

    const tenant = tenantPartner.TenantPartners[0].tenant as TenantDto;

    console.log(tenantPartner.TenantPartners[0]);
    if (!tenantPartner.TenantPartners[0]) {
      throw new Error('Tenant partner not found');
    }

    try {
      const roamingPartner = await this.ocpiGraphqlClient.request<
        CreateRoamingPartnerMutationResult,
        CreateRoamingPartnerMutationVariables
      >(CREATE_ROAMING_PARTNER, {
        countryCode: roamingPartnerCountryCode,
        partyId: roamingPartnerPartyId,
        tenantPartnerId: tenantPartner.TenantPartners[0].id,
      });
      if (!roamingPartner) {
        throw new Error('Failed to create roaming partner');
      }
      console.log(roamingPartner);
      return roamingPartner.insert_RoamingPartners_one?.id;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Failed to create roaming partner');
    }
  }
}
