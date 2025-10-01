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
  GET_EVSE_HIERARCHY_BY_ID_QUERY,
  GetEvseHierarchyByIdQueryResult,
  GetEvseHierarchyByIdQueryVariables,
} from '../graphql';
import {
  GET_LOCATION_BY_ID_QUERY,
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

  async publishLocation(
    locationId: string,
    partnerIds?: string[],
    evseIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      const result = await this.ocpiGraphqlClient.request<
        GetLocationByIdQueryResult,
        GetLocationByIdQueryVariables
      >(GET_LOCATION_BY_ID_QUERY, { id: parseInt(locationId) });

      if (!result.Locations || result.Locations.length === 0) {
        throw new Error(`Location ${locationId} not found`);
      }

      const location = result.Locations[0];
      const targetPartners = await this.getTargetPartners(
        location.tenant as ITenantDto,
        partnerIds,
      );

      const { successfulPartners, validationErrors } =
        await this.validateAndBroadcast(
          location,
          targetPartners,
          this.validateLocationForPublication.bind(this),
          this.locationsBroadcaster.broadcastPutLocation.bind(
            this.locationsBroadcaster,
          ),
        );

      await this.updatePublicationStatusForLocation(
        location as ILocationDto,
        successfulPartners.length > 0,
      );

      if (evseIds && evseIds.length > 0) {
        await this.updatePublicationStatusForEvses(evseIds, true);
      }

      return {
        success: successfulPartners.length > 0,
        locationId,
        publishedToPartners: successfulPartners.map(
          (p) => p?.id?.toString() || '',
        ),
        validationErrors,
        publishedEvses: evseIds?.length || 0,
        publishedConnectors: 0,
      };
    } catch (error) {
      this.logger.error('Error in publishLocation:', error);
      throw error;
    }
  }

  async publishEvse(
    evseId: string,
    partnerIds?: string[],
    connectorIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      const result = await this.ocpiGraphqlClient.request<
        GetEvseHierarchyByIdQueryResult,
        GetEvseHierarchyByIdQueryVariables
      >(GET_EVSE_HIERARCHY_BY_ID_QUERY, { id: parseInt(evseId) });

      if (!result.Evses || result.Evses.length === 0) {
        throw new Error(`EVSE ${evseId} not found`);
      }

      const evse = result.Evses[0] as IEvseDto;
      const tenant = evse.chargingStation?.location?.tenant as ITenantDto;

      if (!tenant) {
        throw new Error(`Tenant not found for EVSE ${evseId}`);
      }

      const targetPartners = await this.getTargetPartners(tenant, partnerIds);

      const { successfulPartners, validationErrors } =
        await this.validateAndBroadcast(
          evse,
          targetPartners,
          this.validateEvseForPublication.bind(this),
          this.locationsBroadcaster.broadcastPutEvse.bind(
            this.locationsBroadcaster,
          ),
        );

      await this.updatePublicationStatusForEvse(
        evse,
        successfulPartners.length > 0,
      );

      if (connectorIds && connectorIds.length > 0) {
        await this.updatePublicationStatusForConnectors(connectorIds, true);
      }

      return {
        success: successfulPartners.length > 0,
        locationId: evse.chargingStation?.locationId?.toString() || '',
        publishedToPartners: successfulPartners.map(
          (p) => p?.id?.toString() || '',
        ),
        validationErrors,
        publishedEvses: successfulPartners.length > 0 ? 1 : 0,
        publishedConnectors: connectorIds?.length || 0,
      };
    } catch (error) {
      this.logger.error('Error in publishEvse:', error);
      throw error;
    }
  }

  async publishConnector(
    evseId: string,
    connectorId: string,
    partnerIds?: string[],
  ): Promise<PublishLocationResponse> {
    try {
      const result = await this.ocpiGraphqlClient.request<
        GetEvseHierarchyByIdQueryResult,
        GetEvseHierarchyByIdQueryVariables
      >(GET_EVSE_HIERARCHY_BY_ID_QUERY, { id: parseInt(evseId) });

      if (!result.Evses || result.Evses.length === 0) {
        throw new Error(`EVSE ${evseId} not found`);
      }

      const evse = result.Evses[0] as IEvseDto;
      const connector = evse.connectors?.find(
        (c) => c.id === parseInt(connectorId),
      );

      if (!connector) {
        throw new Error(`Connector ${connectorId} not found in EVSE ${evseId}`);
      }

      connector.chargingStation = evse.chargingStation;
      const tenant = evse.chargingStation?.location?.tenant as ITenantDto;

      if (!tenant) {
        throw new Error(`Tenant not found for Connector ${connectorId}`);
      }

      const targetPartners = await this.getTargetPartners(tenant, partnerIds);

      const { successfulPartners, validationErrors } =
        await this.validateAndBroadcast(
          connector,
          targetPartners,
          this.validateConnectorForPublication.bind(this),
          this.locationsBroadcaster.broadcastPutConnector.bind(
            this.locationsBroadcaster,
          ),
        );

      await this.updatePublicationStatusForConnector(
        connector,
        successfulPartners.length > 0,
      );

      return {
        success: successfulPartners.length > 0,
        locationId: evse.chargingStation?.locationId?.toString() || '',
        publishedToPartners: successfulPartners.map(
          (p) => p?.id?.toString() || '',
        ),
        validationErrors,
        publishedEvses: 0,
        publishedConnectors: successfulPartners.length > 0 ? 1 : 0,
      };
    } catch (error) {
      this.logger.error('Error in publishConnector:', error);
      throw error;
    }
  }

  private async validateAndBroadcast(
    dto: any,
    partners: ITenantPartnerDto[],
    validationFn: (dto: any, version: VersionNumber) => string[],
    broadcastFn: (
      tenant: ITenantDto,
      dto: any,
      partners: ITenantPartnerDto[],
    ) => Promise<void>,
  ): Promise<{
    successfulPartners: ITenantPartnerDto[];
    validationErrors: string[];
  }> {
    const successfulPartners: ITenantPartnerDto[] = [];
    const validationErrors: string[] = [];
    const tenant =
      dto.tenant ||
      dto.chargingStation?.location?.tenant ||
      dto.evse?.chargingStation?.location?.tenant;

    for (const partner of partners) {
      const version = partner?.partnerProfileOCPI?.version?.version || '';
      const errors = validationFn(dto, version as VersionNumber);

      if (errors.length === 0) {
        await broadcastFn(tenant, dto, [partner]);
        successfulPartners.push(partner);
      } else {
        validationErrors.push(
          `Validation failed for partner ${partner.id}: ${errors.join(', ')}`,
        );
      }
    }
    return { successfulPartners, validationErrors };
  }

  private async getTargetPartners(
    tenant: ITenantDto,
    partnerIds?: string[],
  ): Promise<ITenantPartnerDto[]> {
    if (partnerIds && partnerIds.length > 0) {
      return this.getPartnersByIds(partnerIds);
    }
    return this.getAllPartners(tenant);
  }

  private validateLocationForPublication(
    location: ILocationDto,
    version: VersionNumber,
  ): string[] {
    const errors: string[] = [];
    if (version === VersionNumber.TWO_DOT_TWO_DOT_ONE) {
      if (!location.address) errors.push('Location address is required');
      if (!location.city) errors.push('Location city is required');
      if (!location.country) errors.push('Location country is required');
      if (!location.coordinates) {
        errors.push('Location coordinates are required');
      }
      if (!location.timeZone) errors.push('Location time_zone is required');
    }
    return errors;
  }

  private validateEvseForPublication(
    evse: IEvseDto,
    version: VersionNumber,
  ): string[] {
    const errors: string[] = [];
    if (version === VersionNumber.TWO_DOT_TWO_DOT_ONE) {
      if (!evse.evseId) errors.push(`EVSE ${evse.id} must have an EVSE ID`);
      if (evse.connectors?.length === 0)
        errors.push(`EVSE ${evse.id} must have at least one connector`);
    }
    return errors;
  }

  private validateConnectorForPublication(
    connector: IConnectorDto,
    version: VersionNumber,
  ): string[] {
    const errors: string[] = [];
    if (version === VersionNumber.TWO_DOT_TWO_DOT_ONE) {
      if (!connector.type)
        errors.push(`Connector ${connector.id} must have a type`);
      if (!connector.format)
        errors.push(`Connector ${connector.id} must have a format`);
      if (!connector.powerType)
        errors.push(`Connector ${connector.id} must have a power type`);
      if (!connector.maximumVoltage || connector.maximumVoltage <= 0)
        errors.push(
          `Connector ${connector.id} must have a valid maximum voltage`,
        );
      if (!connector.maximumAmperage || connector.maximumAmperage <= 0)
        errors.push(
          `Connector ${connector.id} must have a valid maximum amperage`,
        );
    }
    return errors;
  }

  private async updatePublicationStatusForLocation(
    location: ILocationDto,
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.ocpiGraphqlClient.request(
      UPDATE_LOCATION_PUBLICATION_STATUS_MUTATION,
      {
        id: location.id,
        isPublished: isPublished || location.isPublished,
        lastPublicationAttempt: now,
      },
    );
  }

  private async updatePublicationStatusForEvse(
    evse: IEvseDto,
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.ocpiGraphqlClient.request(
      UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
      {
        id: evse.id,
        isPublished: isPublished || evse.isPublished,
        lastPublicationAttempt: now,
      },
    );
  }

  private async updatePublicationStatusForConnector(
    connector: IConnectorDto,
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.ocpiGraphqlClient.request(
      UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
      {
        id: connector.id,
        isPublished: isPublished || connector.isPublished,
        lastPublicationAttempt: now,
      },
    );
  }

  private async updatePublicationStatusForEvses(
    evseIds: string[],
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    for (const evseId of evseIds) {
      await this.ocpiGraphqlClient.request(
        UPDATE_EVSE_PUBLICATION_STATUS_MUTATION,
        {
          id: evseId,
          isPublished,
          lastPublicationAttempt: now,
        },
      );
    }
  }

  private async updatePublicationStatusForConnectors(
    connectorIds: string[],
    isPublished: boolean,
  ): Promise<void> {
    const now = new Date().toISOString();
    for (const connectorId of connectorIds) {
      await this.ocpiGraphqlClient.request(
        UPDATE_CONNECTOR_PUBLICATION_STATUS_MUTATION,
        {
          id: connectorId,
          isPublished,
          lastPublicationAttempt: now,
        },
      );
    }
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
}
