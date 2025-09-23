// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service } from 'typedi';
import { OcpiHeaders } from '../model/OcpiHeaders';
import { OcpiGraphqlClient } from '../graphql';
import {
  LIST_TENANT_PARTNERS_BY_CPO,
  GET_TARIFF_BY_KEY_QUERY,
  UPDATE_TARIFF_PUBLICATION_STATUS_MUTATION,
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
} from '../graphql';
import { ModuleId } from '../model/ModuleId';
import { ITenantPartnerDto, ITenantDto, ITariffDto } from '@citrineos/base';
import {
  TenantPartnersListQueryResult,
  TenantPartnersListQueryVariables,
} from '../graphql';
import { TariffsBroadcaster } from '../broadcaster';
import { ILogObj, Logger } from 'tslog';

export interface PublishTariffRequest {
  tariffId: string;
  partnerIds?: string[]; // Optional: specific partner IDs to publish to
}

export interface PublishTariffResponse {
  success: boolean;
  tariffId: string;
  publishedToPartners: string[];
  validationErrors?: string[];
}

@Service()
export class AdminTariffsService {
  constructor(
    private logger: Logger<ILogObj>,
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly tariffsBroadcaster: TariffsBroadcaster,
  ) {}

  async publishTariff(
    ocpiHeaders: OcpiHeaders,
    tariffId: string,
    partnerIds?: string[],
  ): Promise<PublishTariffResponse> {
    try {
      // Extract CPO credentials from OCPI headers
      const cpoCountryCode = ocpiHeaders.toCountryCode;
      const cpoPartyId = ocpiHeaders.toPartyId;

      if (!cpoCountryCode || !cpoPartyId) {
        throw new Error(
          'CPO country code and party ID are required in OCPI headers',
        );
      }

      // Fetch the tariff using GraphQL query
      const result = await this.ocpiGraphqlClient.request<
        GetTariffByKeyQueryResult,
        GetTariffByKeyQueryVariables
      >(GET_TARIFF_BY_KEY_QUERY, {
        id: parseInt(tariffId),
        countryCode: cpoCountryCode,
        partyId: cpoPartyId,
      });

      if (!result.Tariffs || result.Tariffs.length === 0) {
        throw new Error(`Tariff ${tariffId} not found`);
      }

      const tariff = result.Tariffs[0];

      // Validate tariff completeness before publishing
      const validationErrors = this.validateTariffForPublication(tariff);
      if (validationErrors.length > 0) {
        // Update tariff with validation errors using GraphQL mutation
        await this.ocpiGraphqlClient.request(
          UPDATE_TARIFF_PUBLICATION_STATUS_MUTATION,
          {
            id: tariff.id,
            isPublished: false,
            publishedToPartners: tariff.publishedToPartners || [],
            validationErrors,
            lastPublicationAttempt: new Date().toISOString(),
          },
        );

        return {
          success: false,
          tariffId,
          publishedToPartners: [],
          validationErrors,
        };
      }

      // Determine which partners to publish to
      const targetPartners =
        partnerIds || (await this.getAllPartnerIds(ocpiHeaders));

      // Attempt to publish to each partner
      const publishedToPartners: string[] = [];
      const publishErrors: string[] = [];

      for (const partnerId of targetPartners) {
        try {
          await this.publishTariffToPartner(tariff, partnerId, ocpiHeaders);
          publishedToPartners.push(partnerId);
        } catch (error) {
          publishErrors.push(
            `Failed to publish to ${partnerId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Update tariff publication status using GraphQL mutation
      const currentPublishedPartners = tariff.publishedToPartners || [];
      const updatedPublishedPartners = Array.from(
        new Set([...currentPublishedPartners, ...publishedToPartners]),
      );

      await this.ocpiGraphqlClient.request(
        UPDATE_TARIFF_PUBLICATION_STATUS_MUTATION,
        {
          id: tariff.id,
          isPublished: publishedToPartners.length > 0,
          publishedToPartners: updatedPublishedPartners,
          validationErrors: publishErrors.length > 0 ? publishErrors : null,
          lastPublicationAttempt: new Date().toISOString(),
        },
      );

      return {
        success: publishedToPartners.length > 0,
        tariffId,
        publishedToPartners,
        validationErrors: publishErrors.length > 0 ? publishErrors : undefined,
      };
    } catch (error) {
      this.logger.error('Error in publishTariff:', error);
      throw error;
    }
  }

  private validateTariffForPublication(tariff: any): string[] {
    const errors: string[] = [];

    if (!tariff.currency) errors.push('Tariff currency is required');
    if (tariff.pricePerKwh === null || tariff.pricePerKwh === undefined) {
      errors.push('Tariff price per kWh is required');
    }
    if (tariff.pricePerKwh < 0) {
      errors.push('Tariff price per kWh must be non-negative');
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

      // Query for all tenant partners that support tariffs endpoint
      const result = await this.ocpiGraphqlClient.request<
        TenantPartnersListQueryResult,
        TenantPartnersListQueryVariables
      >(LIST_TENANT_PARTNERS_BY_CPO, {
        cpoCountryCode,
        cpoPartyId,
        endpointIdentifier: ModuleId.Tariffs,
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

  private async publishTariffToPartner(
    tariff: any,
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

      // Get tenant information for the tariff
      const tenant: ITenantDto = {
        id: tariff.tenantId,
        countryCode: tariff.tenant.countryCode,
        partyId: tariff.tenant.partyId,
      } as unknown as ITenantDto;

      // Prepare tariff DTO
      const tariffDto: ITariffDto = {
        id: tariff.id,
        authorizationAmount: tariff.authorizationAmount,
        currency: tariff.currency,
        paymentFee: tariff.paymentFee,
        pricePerKwh: tariff.pricePerKwh,
        pricePerMin: tariff.pricePerMin,
        pricePerSession: tariff.pricePerSession,
        stationId: tariff.stationId,
        taxRate: tariff.taxRate,
        tariffAltText: tariff.tariffAltText,
        tenant,
        tenantId: tariff.tenantId,
        createdAt: tariff.createdAt,
        updatedAt: tariff.updatedAt,
      } as unknown as ITariffDto;

      // Use TariffsBroadcaster to publish the tariff
      await this.tariffsBroadcaster.broadcastPutTariff(tenant, tariffDto);

      this.logger?.info(
        `Successfully published tariff ${tariff.id} to partner ${partnerId}`,
      );
    } catch (error) {
      this.logger?.error(
        `Failed to publish tariff ${tariff.id} to partner ${partnerId}:`,
        error,
      );
      throw error;
    }
  }
}
