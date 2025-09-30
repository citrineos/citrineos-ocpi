// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import {
  GetLocationByIdQueryResult,
  GetLocationByIdQueryVariables,
  GetTenantPartnersByIdsQueryResult,
  GetTenantPartnersByIdsQueryVariables,
  OcpiGraphqlClient,
  TenantPartnersListQueryResult,
  TenantPartnersListQueryVariables,
} from '../graphql';
import {
  GET_LOCATION_BY_ID_QUERY,
  GET_EVSE_HIERARCHY_BY_ID_QUERY,
  GET_TENANT_PARTNERS_BY_IDS,
  LIST_TENANT_PARTNERS_BY_CPO,
  UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
  UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
  UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
} from '../graphql';
import { ModuleId } from '../model/ModuleId';
import {
  IConnectorDto,
  IEvseDto,
  ILocationDto,
  ITenantDto,
  ITenantPartnerDto,
} from '@citrineos/base';
import { LocationsBroadcaster } from '../broadcaster';
import { ILogObj, Logger } from 'tslog';
import { PublishLocationResponse } from '../model/DTO/LocationDTO';
import { VersionNumber } from '../model/VersionNumber';

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly locationsBroadcaster: LocationsBroadcaster,
  ) {}

  async publishLocationHierarchy(
    locationId: string,
    partnerIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      // Fetch the location with all its EVSEs and connectors
      const result = await this.ocpiGraphqlClient.request<
        GetLocationByIdQueryResult,
        GetLocationByIdQueryVariables
      >(GET_LOCATION_BY_ID_QUERY, { id: parseInt(locationId) });

      if (!result.Locations || result.Locations.length === 0) {
        throw new Error(`Location ${locationId} not found`);
      }

      const location = result.Locations[0];

      // Determine which partners to publish to
      const targetPartners = await this.getTargetPartners(
        location.tenant,
        partnerIds,
      );

      if (targetPartners.length === 0) {
        this.logger.warn('No target partners found for publication.');
        return {
          success: false,
          locationId,
          publishedToPartners: [],
          validationErrors: ['No target partners found for publication.'],
          publishedEvses: 0,
          publishedConnectors: 0,
        };
      }

      // Publish the entire hierarchy to validated partners
      const { successfulPartners, validationErrors } =
        await this.publishToPartners(location, targetPartners);

      // Update publication status for location and all its components
      await this.updatePublicationStatusForHierarchy(
        location,
        successfulPartners.length > 0,
      );

      const totalEvses = location.chargingPool?.reduce(
        (sum: any, cp: any) => sum + (cp.evses?.length || 0),
        0,
      );
      const totalConnectors = location.chargingPool?.reduce(
        (sum: any, cp: any) =>
          sum +
          cp.evses?.reduce(
            (evseSum: any, evse: any) =>
              evseSum + (evse.connectors?.length || 0),
            0,
          ),
        0,
      );

      return {
        success: successfulPartners.length > 0,
        locationId,
        publishedToPartners: successfulPartners.map((p) => p.id.toString()),
        validationErrors,
        publishedEvses: successfulPartners.length > 0 ? totalEvses : 0,
        publishedConnectors:
          successfulPartners.length > 0 ? totalConnectors : 0,
      };
    } catch (error) {
      this.logger.error('Error in publishLocationHierarchy:', error);
      // In case of a broad failure, update status with error
      const locationResult = await this.ocpiGraphqlClient
        .request<
          GetLocationByIdQueryResult,
          GetLocationByIdQueryVariables
        >(GET_LOCATION_BY_ID_QUERY, { id: parseInt(locationId) })
        .catch(() => null); // Avoid crashing if location fetch fails

      if (locationResult?.Locations?.length) {
        await this.updatePublicationStatusForHierarchy(
          locationResult.Locations[0],
          false,
        );
      }
      throw error;
    }
  }

  async publishEvseHierarchy(
    evseId: string,
    partnerIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      // Fetch the EVSE with its connectors and parent location/tenant
      const result = await this.ocpiGraphqlClient.request<any, any>(
        GET_EVSE_HIERARCHY_BY_ID_QUERY,
        { id: parseInt(evseId) },
      );

      if (!result.Evses || result.Evses.length === 0) {
        throw new Error(`EVSE ${evseId} not found`);
      }

      const evse = result.Evses[0];
      const tenant = evse.chargingStation?.location?.tenant;

      if (!tenant) {
        throw new Error(`Tenant not found for EVSE ${evseId}`);
      }

      // Determine which partners to publish to
      const targetPartners = await this.getTargetPartners(tenant, partnerIds);

      if (targetPartners.length === 0) {
        return {
          success: false,
          locationId: evse.chargingStation?.locationId,
          publishedToPartners: [],
          validationErrors: ['No target partners found for publication.'],
          publishedEvses: 0,
          publishedConnectors: 0,
        };
      }

      // Publish the EVSE and its connectors to validated partners
      const { successfulPartners, validationErrors } =
        await this.publishEvseToPartners(evse, targetPartners);

      // Update publication status
      await this.updatePublicationStatusForEvseHierarchy(
        evse,
        successfulPartners.length > 0,
      );

      return {
        success: successfulPartners.length > 0,
        locationId: evse.chargingStation?.locationId,
        publishedToPartners: successfulPartners.map((p) => p.id.toString()),
        validationErrors,
        publishedEvses: successfulPartners.length > 0 ? 1 : 0,
        publishedConnectors:
          successfulPartners.length > 0 ? evse.connectors?.length || 0 : 0,
      };
    } catch (error) {
      this.logger.error('Error in publishEvseHierarchy:', error);
      throw error;
    }
  }

  private async getTargetPartners(
    tenant: ITenantDto,
    partnerIds?: string[],
  ): Promise<ITenantPartnerDto[]> {
    if (partnerIds && partnerIds.length > 0) {
      this.logger.debug(
        `Publishing to specific partners: ${partnerIds.join(', ')}`,
      );
      return this.getPartnersByIds(partnerIds);
    } else {
      this.logger.debug('Publishing to all partners for tenant.');
      if (!tenant) {
        throw new Error(`Tenant not found.`);
      }
      return this.getAllPartners(tenant);
    }
  }

  private async publishToPartners(
    location: any,
    partners: ITenantPartnerDto[],
  ): Promise<{
    successfulPartners: ITenantPartnerDto[];
    validationErrors: string[];
  }> {
    const successfulPartners: ITenantPartnerDto[] = [];
    const validationErrors: string[] = [];

    for (const partner of partners) {
      const version = partner.partnerProfileOCPI.version
        .version as VersionNumber;
      const errors = this.validateLocationHierarchyForPublication(
        location,
        version,
      );

      if (errors.length === 0) {
        await this.publishHierarchyToPartners(location, [partner]);
        successfulPartners.push(partner);
      } else {
        validationErrors.push(
          `Validation failed for partner ${partner.id}: ${errors.join(', ')}`,
        );
      }
    }
    return { successfulPartners, validationErrors };
  }

  private async publishEvseToPartners(
    evse: any,
    partners: ITenantPartnerDto[],
  ): Promise<{
    successfulPartners: ITenantPartnerDto[];
    validationErrors: string[];
  }> {
    const successfulPartners: ITenantPartnerDto[] = [];
    const validationErrors: string[] = [];
    const tenant = evse.chargingStation?.location?.tenant;

    for (const partner of partners) {
      const version = partner.partnerProfileOCPI.version
        .version as VersionNumber;
      const errors = this.validateEvseHierarchyForPublication(evse, version);

      if (errors.length === 0) {
        await this.locationsBroadcaster.broadcastPutEvse(
          tenant,
          evse as IEvseDto,
          [partner],
        );
        if (evse.connectors) {
          for (const connector of evse.connectors) {
            await this.locationsBroadcaster.broadcastPutConnector(
              tenant,
              connector as IConnectorDto,
              [partner],
            );
          }
        }
        successfulPartners.push(partner);
      } else {
        validationErrors.push(
          `Validation failed for partner ${partner.id}: ${errors.join(', ')}`,
        );
      }
    }
    return { successfulPartners, validationErrors };
  }

  private async publishHierarchyToPartners(
    location: any,
    partners: ITenantPartnerDto[],
  ) {
    const tenant = { id: location.tenantId } as ITenantDto;

    // Broadcast PUT for Location, EVSEs, and Connectors
    await this.locationsBroadcaster.broadcastPutLocation(
      tenant,
      location as ILocationDto,
      partners,
    );

    if (location.chargingPool) {
      for (const station of location.chargingPool) {
        if (station.evses) {
          for (const evse of station.evses) {
            await this.locationsBroadcaster.broadcastPutEvse(
              tenant,
              evse as IEvseDto,
              partners,
            );
            if (evse.connectors) {
              for (const connector of evse.connectors) {
                await this.locationsBroadcaster.broadcastPutConnector(
                  tenant,
                  connector as IConnectorDto,
                  partners,
                );
              }
            }
          }
        }
      }
    }
  }

  private async updatePublicationStatusForHierarchy(
    location: any,
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update location
    await this.ocpiGraphqlClient.request(
      UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
      {
        id: location.id,
        isPublished: isPublished || location.isPublished,
        lastPublicationAttempt: now,
      },
    );

    // Update all EVSEs and connectors in the hierarchy
    if (location.chargingPool) {
      for (const station of location.chargingPool) {
        if (station.evses) {
          for (const evse of station.evses) {
            await this.ocpiGraphqlClient.request(
              UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
              {
                id: evse.id,
                isPublished: isPublished || evse.isPublished,
                lastPublicationAttempt: now,
              },
            );

            if (evse.connectors) {
              for (const connector of evse.connectors) {
                await this.ocpiGraphqlClient.request(
                  UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
                  {
                    id: connector.id,
                    isPublished: isPublished || connector.isPublished,
                    lastPublicationAttempt: now,
                  },
                );
              }
            }
          }
        }
      }
    }
  }

  private validateLocationHierarchyForPublication(
    location: any,
    version: VersionNumber,
  ): string[] {
    const errors: string[] = [];

    // OCPI 2.2.1 validation
    if (version === VersionNumber.TWO_DOT_TWO_DOT_ONE) {
      if (!location.address) errors.push('Location address is required');
      if (!location.city) errors.push('Location city is required');
      if (!location.country) errors.push('Location country is required');
      if (!location.coordinates) {
        errors.push('Location coordinates are required');
      }
      if (!location.time_zone) errors.push('Location time_zone is required');
      if (!location.last_updated)
        errors.push('Location last_updated is required');
      if (!location.party_id) errors.push('Location party_id is required');

      if (location.chargingPool) {
        for (const station of location.chargingPool) {
          if (station.evses) {
            for (const evse of station.evses) {
              errors.push(
                ...this.validateEvseHierarchyForPublication(evse, version),
              );
            }
          }
        }
      }
    }
    // todo: add other versions as needed - default shold throw error

    return errors;
  }

  private async getPartnersByIds(
    partnerIds: string[],
  ): Promise<ITenantPartnerDto[]> {
    const result = await this.ocpiGraphqlClient.request<
      GetTenantPartnersByIdsQueryResult,
      GetTenantPartnersByIdsQueryVariables
    >(GET_TENANT_PARTNERS_BY_IDS, {
      ids: partnerIds.map((id) => parseInt(id, 10)),
    });
    return result.TenantPartners as ITenantPartnerDto[];
  }

  private async getAllPartners(
    tenant: ITenantDto,
  ): Promise<ITenantPartnerDto[]> {
    const cpoCountryCode = tenant.countryCode;
    const cpoPartyId = tenant.partyId;

    if (!cpoCountryCode || !cpoPartyId) {
      throw new Error(
        'Tenant country code and party ID are required to get all partners.',
      );
    }

    const result = await this.ocpiGraphqlClient.request<
      TenantPartnersListQueryResult,
      TenantPartnersListQueryVariables
    >(LIST_TENANT_PARTNERS_BY_CPO, {
      cpoCountryCode,
      cpoPartyId,
      endpointIdentifier: ModuleId.Locations,
    });

    return result.TenantPartners as ITenantPartnerDto[];
  }

  private validateEvseHierarchyForPublication(
    evse: any,
    version: VersionNumber,
  ): string[] {
    const errors: string[] = [];

    // OCPI 2.2.1 validation
    if (version === VersionNumber.TWO_DOT_TWO_DOT_ONE) {
      if (!evse.evseId) {
        errors.push(`EVSE ${evse.id} must have an EVSE ID`);
      }
      if (!evse.connectors || evse.connectors.length === 0) {
        errors.push(`EVSE ${evse.evseId} must have at least one connector`);
      } else {
        for (const connector of evse.connectors) {
          if (!connector.type) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a type`,
            );
          }
          if (!connector.format) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a format`,
            );
          }
          if (!connector.powerType) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a power type`,
            );
          }
        }
      }
    }
    // todo: add other versions as needed

    return errors;
  }

  private async updatePublicationStatusForEvseHierarchy(
    evse: any,
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update EVSE
    await this.ocpiGraphqlClient.request(
      UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
      {
        id: evse.id,
        isPublished: isPublished || evse.isPublished,
        lastPublicationAttempt: now,
      },
    );

    // Update all connectors in this EVSE
    if (evse.connectors) {
      for (const connector of evse.connectors) {
        await this.ocpiGraphqlClient.request(
          UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
          {
            id: connector.id,
            isPublished: isPublished || connector.isPublished,
            lastPublicationAttempt: now,
          },
        );
      }
    }
  }
}
