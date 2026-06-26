// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import {
  AsAdminEndpoint,
  BaseController,
  BodyWithSchema,
  LocationsPullService,
  OcpiLogger,
  OnboardRoamingPartnerBodySchema,
  OnboardRoamingPartnerBodySchemaName,
  TariffsService,
  type OnboardRoamingPartnerBody,
} from '@citrineos/ocpi-base';
import { JsonController, Post, Body } from 'routing-controllers';
import { Service } from 'typedi';
import { RoamingPartnerService } from '@citrineos/ocpi-base';

@JsonController('/admin')
@Service()
export class AdminModuleApi extends BaseController {
  constructor(
    readonly logger: OcpiLogger,
    readonly roamingPartnerService: RoamingPartnerService,
    readonly tariffsService: TariffsService,
    readonly locationsPullService: LocationsPullService,
  ) {
    super();
  }

  @Post('/onboard-roaming-partner-cpo')
  @AsAdminEndpoint()
  async onboardRoamingPartner(
    @BodyWithSchema(
      OnboardRoamingPartnerBodySchema,
      OnboardRoamingPartnerBodySchemaName,
    )
    body: OnboardRoamingPartnerBody,
  ): Promise<{ status: string }> {
    const roamingPartnerId =
      await this.roamingPartnerService.createRoamingPartner(body);
    if (!roamingPartnerId) {
      return { status: 'failed To create roaming partner' };
    }
    const pullBody = {
      ourCountryCode: body.ourCountryCode,
      ourPartyId: body.ourPartyId,
      partnerCountryCode: body.partnerCountryCode,
      partnerPartyId: body.partnerPartyId,
      roamingPartnerCountryCode: body.roamingPartnerCountryCode,
      roamingPartnerPartyId: body.roamingPartnerPartyId,
      offset: 0,
      limit: 20,
    };

    void Promise.allSettled([
      this.tariffsService.pullPartnerTariffs({
        ...pullBody,
        offset: 0,
        limit: 100,
      }),
      this.locationsPullService.PullPartnerLocations({
        ...pullBody,
        offset: 0,
        limit: 20,
      }),
    ]).then(([tariffs, locations]) => {
      if (tariffs.status === 'fulfilled') {
        this.logger.info('Tariffs pull completed', tariffs.value);
      } else {
        this.logger.error('Failed to pull tariffs', tariffs.reason);
      }
      if (locations.status === 'fulfilled') {
        this.logger.info('Locations pull completed', locations.value);
      } else {
        this.logger.error('Failed to pull locations', locations.reason);
      }
    });
    return { status: 'accepted' };
  }
}
