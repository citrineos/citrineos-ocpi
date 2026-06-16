// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Service } from 'typedi';
import { LocationsClientApi } from '../trigger/LocationsClientApi.js';
import { buildPaginatedParams } from '../trigger/param/PaginatedParams.js';
import type {
  PullPartnerModulesBody,
  PullSummary,
} from '../model/DTO/PullPartnerModulesBody.js';

import type { TenantPartnerDto } from '@zetra/citrineos-base';
import type { LocationDTO } from '../model/DTO/LocationDTO.js';
import { LocationReceiverService } from './LocationReceiverService.js';
import type {
  GetTenantPartnerByCpoClientAndModuleIdQueryVariables,
  GetTenantPartnerByCpoClientAndModuleIdQueryResult,
  GetKnownLocationIdsQueryResult,
  GetKnownLocationIdsQueryVariables,
  GetKnownLocationIdsWithRoamingPartnerIdQueryResult,
  GetKnownLocationIdsWithRoamingPartnerIdQueryVariables,
  MarkLocationRemovedMutationResult,
  MarkLocationRemovedMutationVariables,
} from '../graphql/index.js';
import {
  GET_KNOWN_LOCATION_IDS_QUERY,
  GET_KNOWN_LOCATION_IDS_QUERY_WITH_ROAMING_PARTNER_ID,
  GET_TENANT_PARTNER_BY_CPO_AND_CLIENT,
  MARK_LOCATION_REMOVED_QUERY,
  OcpiGraphqlClient,
} from '../graphql/index.js';
import type { Endpoint } from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { z } from 'zod';
import { getRoamingPartner } from '../util/helpers.js';

export type KnownLocationRef = {
  id: number;
  ocpiId: string;
};

@Service()
export class LocationsPullService {
  constructor(
    private logger: Logger<ILogObj>,
    private ocpiGraphqlClient: OcpiGraphqlClient,
    private locationsClientApi: LocationsClientApi,
    private locationReceiverService: LocationReceiverService,
  ) {}

  async getKnownLocationIds(
    partner: TenantPartnerDto,
    roamingPartnerCountryCode: string | null,
    roamingPartnerPartyId: string | null,
  ): Promise<KnownLocationRef[]> {
    if (partner.id == null) throw new Error('Partner ID is required');

    const toRefs = (
      locations: Array<{ id?: number | null; ocpiId?: string | null }>,
    ): KnownLocationRef[] =>
      locations
        .filter(
          (l): l is { id: number; ocpiId: string } =>
            l.id != null && l.ocpiId != null,
        )
        .map((l) => ({ id: l.id, ocpiId: l.ocpiId }));

    if (roamingPartnerCountryCode && roamingPartnerPartyId) {
      const roamingPartner = getRoamingPartner(
        partner,
        roamingPartnerCountryCode,
        roamingPartnerPartyId,
      );
      if (!roamingPartner?.id) {
        throw new Error('Roaming partner not found');
      }
      const result = await this.ocpiGraphqlClient.request<
        GetKnownLocationIdsWithRoamingPartnerIdQueryResult,
        GetKnownLocationIdsWithRoamingPartnerIdQueryVariables
      >(GET_KNOWN_LOCATION_IDS_QUERY_WITH_ROAMING_PARTNER_ID, {
        partnerId: partner.id,
        roamingPartnerId: roamingPartner.id,
      });
      return toRefs(result.Locations);
    }
    const result = await this.ocpiGraphqlClient.request<
      GetKnownLocationIdsQueryResult,
      GetKnownLocationIdsQueryVariables
    >(GET_KNOWN_LOCATION_IDS_QUERY, {
      partnerId: partner.id,
    });
    return toRefs(result.Locations);
  }

  async markLocationRemoved(
    locationId: number,
    partner: TenantPartnerDto,
  ): Promise<void> {
    if (partner.id == null) throw new Error('Partner ID is required');
    await this.ocpiGraphqlClient.request<
      MarkLocationRemovedMutationResult,
      MarkLocationRemovedMutationVariables
    >(MARK_LOCATION_REMOVED_QUERY, {
      locationId: locationId,
      partnerId: partner.id,
    });
  }

  async syncDeletedLocations(
    partner: TenantPartnerDto,
    roamingPartnerCountryCode: string | null,
    roamingPartnerPartyId: string | null,
    seenLocationIds: Set<string>,
  ): Promise<void> {
    let markedRemoved = 0;
    let markRemovedFailed = 0;
    const existingIds = await this.getKnownLocationIds(
      partner,
      roamingPartnerCountryCode ?? null,
      roamingPartnerPartyId ?? null,
    );
    const missingIds = existingIds.filter(
      (locationRef) => !seenLocationIds.has(locationRef.ocpiId),
    );
    for (const locationRef of missingIds) {
      try {
        await this.markLocationRemoved(locationRef.id, partner);
        markedRemoved++;
      } catch (err) {
        markRemovedFailed++;
        this.logger.error(
          `PullPartnerLocations: failed to mark location ${locationRef.id} removed`,
          err,
        );
      }
    }
  }

  async PullPartnerLocations(
    body: PullPartnerModulesBody,
  ): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      offset,
      limit,
      date_from,
      date_to,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
    } = body;

    this.logger.info(
      'PullPartnerLocations',
      ourCountryCode,
      ourPartyId,
      cpoCountryCode,
      cpoPartyId,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
    );

    const isFullMode = date_from == null && date_to == null;
    const seenLocationIds = new Set<string>();

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_CPO_AND_CLIENT, {
      cpoCountryCode: ourCountryCode,
      cpoPartyId: ourPartyId,
      clientCountryCode: cpoCountryCode,
      clientPartyId: cpoPartyId,
    });

    const partnerRow = tenantPartner.TenantPartners[0];
    if (!partnerRow?.partnerProfileOCPI) {
      throw new Error('Tenant partner missing partnerProfileOCPI');
    }
    const partner = partnerRow as TenantPartnerDto;

    const endpoints = tenantPartner.TenantPartners[0].partnerProfileOCPI!
      .endpoints as Endpoint[];
    const url = endpoints.find(
      (e: Endpoint) => e.identifier === 'locations_SENDER',
    )?.url;

    if (!url) {
      throw new Error('No locations URL found');
    }

    const paginated = buildPaginatedParams(
      offset,
      limit,
      date_from != null ? new Date(date_from) : undefined,
      date_to != null ? new Date(date_to) : undefined,
    );

    let currentOffset = offset;
    let hasMore = true;
    let processedLocations = 0;
    let upsertSucceededLocations = 0;
    let upsertFailedLocations = 0;
    let skippedInvalidLocations = 0;

    while (hasMore) {
      const resp = await this.locationsClientApi.request(
        ourCountryCode,
        ourPartyId,
        cpoCountryCode,
        cpoPartyId,
        HttpMethod.Get,
        z.any(),
        tenantPartner.TenantPartners[0].partnerProfileOCPI!,
        true,
        url,
        undefined,
        { ...paginated, offset: currentOffset },
        undefined,
        undefined,
        partnerRow.awsSecretCertificateArn,
        roamingPartnerCountryCode ?? null,
        roamingPartnerPartyId ?? null,
      );

      for (const item of (resp as any).data) {
        processedLocations++;
        if (item == null || typeof item !== 'object' || !('id' in item)) {
          skippedInvalidLocations++;
          continue;
        }
        const location = item as LocationDTO;
        try {
          seenLocationIds.add(String(location.id));
          await this.locationReceiverService.upsertLocationForPartner(
            location,
            String(location.id),
            partner,
          );
          upsertSucceededLocations++;
          this.logger.info(
            `PullPartnerLocations: upserted location ${String(location.id)}`,
          );
        } catch (err) {
          upsertFailedLocations++;
          this.logger.error(
            `PullPartnerLocations: failed for location ${String(location.id)}`,
            err,
          );
        }
      }

      const nextOffset: number | undefined = (resp as any).offset;
      if (nextOffset != null) {
        currentOffset = nextOffset;
      } else {
        hasMore = false;
      }
    }

    let markedRemoved = 0;
    let markRemovedFailed = 0;
    if (isFullMode) {
      await this.syncDeletedLocations(partner, roamingPartnerCountryCode ?? null, roamingPartnerPartyId ?? null, seenLocationIds);
    }

    return {
      module: 'locations',
      processed: processedLocations,
      upsertSucceeded: upsertSucceededLocations,
      upsertFailed: upsertFailedLocations,
      skippedInvalid: skippedInvalidLocations,
    };
  }
}
