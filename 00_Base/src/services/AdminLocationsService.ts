// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { OcpiHeaders } from '../model/OcpiHeaders';
import {
  GetLocationByIdQueryResult,
  GetLocationByIdQueryVariables,
  OcpiGraphqlClient,
} from '../graphql';
import {
  LIST_TENANT_PARTNERS_BY_CPO,
  GET_LOCATION_BY_ID_QUERY,
  UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
  UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
  UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
} from '../graphql';
import { ModuleId } from '../model/ModuleId';
import {
  ITenantPartnerDto,
  ITenantDto,
  ILocationDto,
  IEvseDto,
  IConnectorDto,
} from '@citrineos/base';
import {
  TenantPartnersListQueryResult,
  TenantPartnersListQueryVariables,
} from '../graphql';
import { LocationsBroadcaster } from '../broadcaster';
import { ILogObj, Logger } from 'tslog';

export interface PublishLocationRequest {
  partnerIds?: string[]; // Optional: specific partner IDs to publish to
}

export interface PublishLocationResponse {
  success: boolean;
  locationId: string;
  publishedToPartners: string[];
  validationErrors?: string[];
  publishedEvses: number;
  publishedConnectors: number;
}

@Service()
export class AdminLocationsService {
  constructor(
    private logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly locationsBroadcaster: LocationsBroadcaster,
  ) {}

  async publishLocationHierarchy(
    ocpiHeaders: OcpiHeaders,
    locationId: string,
    partnerIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      // Fetch the location with all its EVSEs and connectors using the reusable GraphQL query
      const result = await this.ocpiGraphqlClient.request<
        GetLocationByIdQueryResult,
        GetLocationByIdQueryVariables
      >(GET_LOCATION_BY_ID_QUERY, { id: parseInt(locationId) });

      if (!result.Locations || result.Locations.length === 0) {
        throw new Error(`Location ${locationId} not found`);
      }

      const location = result.Locations[0];

      // Validate the entire location hierarchy before publishing
      const validationErrors =
        this.validateLocationHierarchyForPublication(location);
      if (validationErrors.length > 0) {
        // Update location with validation errors using GraphQL mutation
        await this.ocpiGraphqlClient.request(
          UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
          {
            id: location.id,
            isPublished: false,
            publishedToPartners: location.publishedToPartners || [],
            validationErrors,
            lastPublicationAttempt: new Date().toISOString(),
          },
        );

        return {
          success: false,
          locationId,
          publishedToPartners: [],
          validationErrors,
          publishedEvses: 0,
          publishedConnectors: 0,
        };
      }

      // Determine which partners to publish to
      const targetPartners =
        partnerIds || (await this.getAllPartnerIds(ocpiHeaders));

      // Attempt to publish the entire hierarchy to each partner
      const publishedToPartners: string[] = [];
      const publishErrors: string[] = [];
      let totalEvses = 0;
      let totalConnectors = 0;

      // Count total EVSEs and connectors for the response
      if (location.chargingPool) {
        for (const station of location.chargingPool) {
          if (station.evses) {
            totalEvses += station.evses.length;
            for (const evse of station.evses) {
              if (evse.connectors) {
                totalConnectors += evse.connectors.length;
              }
            }
          }
        }
      }

      for (const partnerId of targetPartners) {
        try {
          await this.publishLocationHierarchyToPartner(
            location,
            partnerId,
            ocpiHeaders,
          );
          publishedToPartners.push(partnerId);
        } catch (error) {
          publishErrors.push(
            `Failed to publish to ${partnerId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Update publication status for location and all its components using GraphQL
      if (publishedToPartners.length > 0) {
        await this.updatePublicationStatusForHierarchy(
          location,
          publishedToPartners,
        );
      }

      // Update the location with overall status using GraphQL mutation
      const currentPublishedPartners = location.publishedToPartners || [];
      const updatedPublishedPartners = Array.from(
        new Set([...currentPublishedPartners, ...publishedToPartners]),
      );

      await this.ocpiGraphqlClient.request(
        UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
        {
          id: location.id,
          isPublished: publishedToPartners.length > 0,
          publishedToPartners: updatedPublishedPartners,
          validationErrors: publishErrors.length > 0 ? publishErrors : null,
          lastPublicationAttempt: new Date().toISOString(),
        },
      );

      return {
        success: publishedToPartners.length > 0,
        locationId,
        publishedToPartners,
        validationErrors: publishErrors.length > 0 ? publishErrors : undefined,
        publishedEvses: publishedToPartners.length > 0 ? totalEvses : 0,
        publishedConnectors:
          publishedToPartners.length > 0 ? totalConnectors : 0,
      };
    } catch (error) {
      this.logger.error('Error in publishLocationHierarchy:', error);
      throw error;
    }
  }

  private async updatePublicationStatusForHierarchy(
    location: any,
    publishedToPartners: string[],
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update all EVSEs and connectors in the hierarchy using GraphQL mutations
    if (location.chargingPool) {
      for (const station of location.chargingPool) {
        if (station.evses) {
          for (const evse of station.evses) {
            // Update EVSE publication status
            const currentEvsePartners = evse.publishedToPartners || [];
            const updatedEvsePartners = Array.from(
              new Set([...currentEvsePartners, ...publishedToPartners]),
            );

            await this.ocpiGraphqlClient.request(
              UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
              {
                id: evse.id,
                isPublished: true,
                publishedToPartners: updatedEvsePartners,
                validationErrors: null,
                lastPublicationAttempt: now,
              },
            );

            // Update all connectors in this EVSE
            if (evse.connectors) {
              for (const connector of evse.connectors) {
                const currentConnectorPartners =
                  connector.publishedToPartners || [];
                const updatedConnectorPartners = Array.from(
                  new Set([
                    ...currentConnectorPartners,
                    ...publishedToPartners,
                  ]),
                );

                await this.ocpiGraphqlClient.request(
                  UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
                  {
                    id: connector.id,
                    isPublished: true,
                    publishedToPartners: updatedConnectorPartners,
                    validationErrors: null,
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

  private validateLocationHierarchyForPublication(location: any): string[] {
    const errors: string[] = [];

    // Validate location basic fields
    if (!location.name) errors.push('Location name is required');
    if (!location.address) errors.push('Location address is required');
    if (!location.city) errors.push('Location city is required');
    if (!location.country) errors.push('Location country is required');
    if (!location.coordinates) errors.push('Location coordinates are required');

    // Check if location has at least one charging station
    if (!location.chargingPool || location.chargingPool.length === 0) {
      errors.push('Location must have at least one charging station');
      return errors; // No point checking further
    }

    // Validate each charging station has EVSEs with connectors
    let hasValidStation = false;
    for (const station of location.chargingPool) {
      if (!station.evses || station.evses.length === 0) {
        errors.push(
          `Charging station ${station.id} must have at least one EVSE`,
        );
        continue;
      }

      let hasValidEvse = false;
      for (const evse of station.evses) {
        // Validate EVSE
        if (!evse.evseId) {
          errors.push(`EVSE ${evse.id} must have an EVSE ID`);
          continue;
        }

        if (!evse.connectors || evse.connectors.length === 0) {
          errors.push(`EVSE ${evse.evseId} must have at least one connector`);
          continue;
        }

        // Validate connectors
        let hasValidConnector = false;
        for (const connector of evse.connectors) {
          if (!connector.type) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a type`,
            );
            continue;
          }
          if (!connector.format) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a format`,
            );
            continue;
          }
          if (!connector.powerType) {
            errors.push(
              `Connector ${connector.id} in EVSE ${evse.evseId} must have a power type`,
            );
            continue;
          }
          hasValidConnector = true;
        }

        if (hasValidConnector) {
          hasValidEvse = true;
        }
      }

      if (hasValidEvse) {
        hasValidStation = true;
      }
    }

    if (!hasValidStation) {
      errors.push(
        'Location must have at least one complete charging station with valid EVSEs and connectors',
      );
    }

    return errors;
  }

  private async getAllPartnerIds(ocpiHeaders: OcpiHeaders): Promise<string[]> {
    try {
      // Extract CPO credentials from OCPI headers
      const cpoCountryCode = ocpiHeaders.toCountryCode;
      const cpoPartyId = ocpiHeaders.toPartyId;

      if (!cpoCountryCode || !cpoPartyId) {
        throw new Error(
          'CPO country code and party ID are required in OCPI headers',
        );
      }

      // Query for all tenant partners that support locations endpoint
      const result = await this.ocpiGraphqlClient.request<
        TenantPartnersListQueryResult,
        TenantPartnersListQueryVariables
      >(LIST_TENANT_PARTNERS_BY_CPO, {
        cpoCountryCode,
        cpoPartyId,
        endpointIdentifier: ModuleId.Locations,
      });

      // Extract partner IDs from the result
      const partners = result.TenantPartners as ITenantPartnerDto[];
      const partnerIds: string[] = [];
      if (partners && Array.isArray(partners)) {
        for (const partner of partners) {
          if (partner.countryCode && partner.partyId) {
            // Create a unique partner identifier using countryCode_partyId format
            partnerIds.push(`${partner.countryCode}_${partner.partyId}`);
          }
        }
      }

      return partnerIds;
    } catch (error) {
      console.error('Failed to fetch partner IDs:', error);
      // Return empty array if we can't fetch partners, rather than failing the entire operation
      return [];
    }
  }

  private async publishLocationHierarchyToPartner(
    location: any,
    partnerId: string,
    ocpiHeaders: OcpiHeaders,
  ): Promise<void> {
    try {
      // Parse partner ID (format: countryCode_partyId)
      const [partnerCountryCode, partnerPartyId] = partnerId.split('_');
      if (!partnerCountryCode || !partnerPartyId) {
        throw new Error(
          `Invalid partner ID format: ${partnerId}. Expected format: countryCode_partyId`,
        );
      }

      // Get tenant information for the location
      const tenant: ITenantDto = {
        id: location.tenantId,
        countryCode: ocpiHeaders.toCountryCode,
        partyId: ocpiHeaders.toPartyId,
      } as unknown as ITenantDto;

      // First, publish the location itself
      const locationDto = {
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        state: location.state,
        country: location.country,
        coordinates: location.coordinates,
        parkingType: location.parkingType,
        facilities: location.facilities,
        openingHours: location.openingHours,
        timeZone: location.timeZone,
        publishUpstream: location.publishUpstream,
        tenant,
        tenantId: location.tenantId,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      } as unknown as ILocationDto;

      await this.locationsBroadcaster.broadcastPutLocation(tenant, locationDto);

      // Then publish all EVSEs and their connectors
      if (location.chargingPool) {
        for (const station of location.chargingPool) {
          if (station.evses) {
            for (const evse of station.evses) {
              // Prepare EVSE DTO
              const evseDto = {
                id: evse.id,
                stationId: evse.stationId,
                evseTypeId: evse.evseTypeId,
                evseId: evse.evseId,
                physicalReference: evse.physicalReference,
                removed: evse.removed,
                chargingStation: {
                  id: station.id,
                  stationId: station.stationId,
                  name: station.name,
                  locationId: location.id,
                  tenantId: location.tenantId,
                },
                tenant,
                tenantId: location.tenantId,
                createdAt: evse.createdAt,
                updatedAt: evse.updatedAt,
              } as unknown as IEvseDto;

              await this.locationsBroadcaster.broadcastPutEvse(tenant, evseDto);

              // Publish all connectors for this EVSE
              if (evse.connectors) {
                for (const connector of evse.connectors) {
                  const connectorDto = {
                    id: connector.id,
                    stationId: connector.stationId,
                    evseId: connector.evseId,
                    connectorId: connector.connectorId,
                    evseTypeConnectorId: connector.evseTypeConnectorId,
                    status: connector.status,
                    type: connector.type,
                    format: connector.format,
                    errorCode: connector.errorCode,
                    powerType: connector.powerType,
                    maximumAmperage: connector.maximumAmperage,
                    maximumVoltage: connector.maximumVoltage,
                    maximumPowerWatts: connector.maximumPowerWatts,
                    timestamp: connector.timestamp,
                    info: connector.info,
                    vendorId: connector.vendorId,
                    vendorErrorCode: connector.vendorErrorCode,
                    termsAndConditionsUrl: connector.termsAndConditionsUrl,
                    chargingStation: {
                      id: station.id,
                      stationId: station.stationId,
                      name: station.name,
                      locationId: location.id,
                      tenantId: location.tenantId,
                    },
                    tenant,
                    tenantId: location.tenantId,
                    createdAt: connector.createdAt,
                    updatedAt: connector.updatedAt,
                  } as unknown as IConnectorDto;

                  await this.locationsBroadcaster.broadcastPutConnector(
                    tenant,
                    connectorDto,
                  );
                }
              }
            }
          }
        }
      }

      this.logger?.info(
        `Successfully published location hierarchy ${location.id} to partner ${partnerId}`,
      );
    } catch (error) {
      this.logger?.error(
        `Failed to publish location hierarchy ${location.id} to partner ${partnerId}:`,
        error,
      );
      throw error;
    }
  }
}
