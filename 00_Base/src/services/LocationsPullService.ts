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
  GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryResult,
  GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryVariables,
  GetLocationByOcpiIdAndPartnerIdQueryResult,
  GetLocationByOcpiIdAndPartnerIdQueryVariables,
  MarkEvseRemovedMutationResult,
  MarkEvseRemovedMutationVariables,
  MarkConnectorDeletedMutationResult,
  MarkConnectorDeletedMutationVariables,
} from '../graphql/index.js';
import {
  GET_KNOWN_LOCATION_IDS_QUERY,
  GET_KNOWN_LOCATION_IDS_QUERY_WITH_ROAMING_PARTNER_ID,
  GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY
,
  MARK_LOCATION_REMOVED_QUERY,
  GET_LOCATION_BY_OCPI_ID_PARTNER_AND_ROAMING_PARTNER_ID_QUERY,
  OcpiGraphqlClient,
  GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY,
  MARK_EVSE_REMOVED_QUERY,
  MARK_CONNECTOR_DELETED_QUERY,
} from '../graphql/index.js';
import type { Endpoint } from '@zetra/citrineos-base';
import { HttpMethod } from '@zetra/citrineos-base';
import { z } from 'zod';
import { getRoamingPartner } from '../util/helpers.js';

export type KnownLocationRef = {
  id: number;
  ocpiId: string;
};

export type KnownEvseRef = {
  id: number;
  ocpiUid: string;
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
      deletedAt: new Date().toISOString(),
    });
  }

  async syncDeletedLocations(
    partner: TenantPartnerDto,
    roamingPartnerCountryCode: string | null,
    roamingPartnerPartyId: string | null,
    seenLocationIds: Set<string>,
  ): Promise<{ markedRemoved: number; markRemovedFailed: number }> {
    let markedRemoved: number = 0;
    let markRemovedFailed: number = 0;
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
    return {
      markedRemoved: markedRemoved,
      markRemovedFailed: markRemovedFailed,
    };
  }

  async markEvseRemoved(evseId: number): Promise<void> {
    await this.ocpiGraphqlClient.request<
      MarkEvseRemovedMutationResult,
      MarkEvseRemovedMutationVariables
    >(MARK_EVSE_REMOVED_QUERY, {
      evseId: evseId,
    });
  }

  async markConnectorRemoved(connectorId: number): Promise<void> {
    await this.ocpiGraphqlClient.request<
      MarkConnectorDeletedMutationResult,
      MarkConnectorDeletedMutationVariables
    >(MARK_CONNECTOR_DELETED_QUERY, {
      connectorId,
      deletedAt: new Date().toISOString(),
    });
  }

  async reconcileEvsesForLocation(
    partner: TenantPartnerDto,
    locationOcpiId: string,
    payloadEvses: LocationDTO['evses'],
    roamingPartnerCountryCode: string | null,
    roamingPartnerPartyId: string | null,
    fullMode: boolean,
  ): Promise<void> {
    if (!partner.id) throw new Error('Partner ID is required');

    let roamingPartnerId: number | undefined;
    if (roamingPartnerCountryCode && roamingPartnerPartyId) {
      const roamingPartner = getRoamingPartner(
        partner,
        roamingPartnerCountryCode,
        roamingPartnerPartyId,
      );
      if (!roamingPartner?.id) {
        throw new Error('Roaming partner not found');
      }
      roamingPartnerId = roamingPartner.id;
    }

    const result =
      roamingPartnerId != null
        ? await this.ocpiGraphqlClient.request<
            GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryResult,
            GetLocationByOcpiIdPartnerAndRoamingPartnerIdQueryVariables
          >(GET_LOCATION_BY_OCPI_ID_PARTNER_AND_ROAMING_PARTNER_ID_QUERY, {
            id: locationOcpiId,
            partnerId: partner.id,
            roamingPartnerId,
          })
        : await this.ocpiGraphqlClient.request<
            GetLocationByOcpiIdAndPartnerIdQueryResult,
            GetLocationByOcpiIdAndPartnerIdQueryVariables
          >(GET_LOCATION_BY_OCPI_ID_AND_PARTNER_ID_QUERY, {
            id: locationOcpiId,
            partnerId: partner.id,
          });

    const locationRow = result.Locations[0];
    if (!locationRow) return;

    const payloadEvseUids = new Set((payloadEvses ?? []).map((e) => e.uid));
    const payloadConnectorsByEvseUid = new Map(
      (payloadEvses ?? []).map((e) => [
        e.uid,
        new Set((e.connectors ?? []).map((c) => c.id)),
      ]),
    );

    const dbEvses =
      locationRow.chargingPool
        ?.flatMap((cs) => cs.evses ?? [])
        .filter(
          (e) => e.id != null && e.ocpiUid != null && e.removed !== true,
        ) ?? [];

    for (const evse of dbEvses) {
      // in full mode, if evse is not in the payload, mark it as removed
      if (fullMode) {
        if (!payloadEvseUids.has(evse.ocpiUid!)) {
          await this.markEvseRemoved(evse.id!);
          continue;
        }
      }
      const payloadConnectorIds =
        payloadConnectorsByEvseUid.get(evse.ocpiUid!) ?? new Set();
      const dbConnectors = (evse.connectors ?? []).filter(
        (c) => c.id != null && c.deletedAt === null,
      );
      // if connector is not in the payload, mark it as removed
      // in full mode AND in not full mode
      for (const connector of dbConnectors) {
        if (!payloadConnectorIds.has(connector.ocpiId!)) {
          await this.markConnectorRemoved(connector.id!);
        }
      }
    }
  }

  async PullPartnerLocations(
    body: PullPartnerModulesBody,
  ): Promise<PullSummary> {
    const {
      ourCountryCode,
      ourPartyId,
      partnerCountryCode,
      partnerPartyId,
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
      partnerCountryCode,
      partnerPartyId,
      roamingPartnerCountryCode,
      roamingPartnerPartyId,
      date_from,
      date_to,
    );

    // if date_from and date_to are not set, it means we are in full pull mode
    const isFullMode = date_from == null && date_to == null;
    const seenLocationIds = new Set<string>();

    const tenantPartner = await this.ocpiGraphqlClient.request<
      GetTenantPartnerByCpoClientAndModuleIdQueryResult,
      GetTenantPartnerByCpoClientAndModuleIdQueryVariables
    >(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY
, {
      ourCountryCode: ourCountryCode,
      ourPartyId: ourPartyId,
      partnerCountryCode: partnerCountryCode,
      partnerPartyId: partnerPartyId,
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
        partnerCountryCode,
        partnerPartyId,
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
          const upserted =
            await this.locationReceiverService.upsertLocationForPartner(
              location,
              String(location.id),
              partner,
            );

          // in not full mode, if all evses are removed, mark the location as removed
          if (!isFullMode) {
            const evses = location.evses ?? [];
            if (
              evses.length > 0 &&
              evses.every((e) => e.status === 'REMOVED')
            ) {
              await this.markLocationRemoved(upserted.locationId, partner);
            }
          }
          let roamingPartner = null;
          if (
            location.country_code != partner.countryCode ||
            location.party_id != partner.partyId
          ) {
            roamingPartner = {
              countryCode: location.country_code,
              partyId: location.party_id,
            };
          }
          // reconcile evse statuses
          await this.reconcileEvsesForLocation(
            partner,
            String(location.id),
            location.evses ?? [],
            roamingPartnerCountryCode ?? roamingPartner?.countryCode ?? null,
            roamingPartnerPartyId ?? roamingPartner?.partyId ?? null,
            isFullMode,
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

    let markedRemoved: number | undefined;
    let markRemovedFailed: number | undefined;
    // in full mode, if locations are not in the response, mark them as removed
    if (isFullMode) {
      const {
        markedRemoved: markedRemovedTemp,
        markRemovedFailed: markRemovedFailedTemp,
      } = await this.syncDeletedLocations(
        partner,
        roamingPartnerCountryCode ?? null,
        roamingPartnerPartyId ?? null,
        seenLocationIds,
      );
      markedRemoved = markedRemovedTemp;
      markRemovedFailed = markRemovedFailedTemp;
    }

    return {
      module: 'locations',
      processed: processedLocations,
      upsertSucceeded: upsertSucceededLocations,
      upsertFailed: upsertFailedLocations,
      skippedInvalid: skippedInvalidLocations,
      LocationsMarkedRemoved: markedRemoved,
      LocationsMarkedRemovedFailed: markRemovedFailed,
    };
  }
}
