import { BaseClientApi } from './BaseClientApi';
import { Tariff, TariffResponse } from '../model/Tariff';
import { Service } from 'typedi';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { ModuleId } from '../model/ModuleId';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { OCPIRegistration } from '@citrineos/base';

@Service()
export class TariffsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tariffs;

  getUrl(partnerProfile: OCPIRegistration.PartnerProfile): string {
    const url = partnerProfile.endpoints?.find(
      (value: OCPIRegistration.Endpoint) =>
        value.identifier === EndpointIdentifier.TARIFFS_RECEIVER,
    )?.url;
    if (!url) {
      throw new Error(
        `No tariffs endpoint available for partnerProfile ${JSON.stringify(partnerProfile)}`,
      );
    }
    return url;
  }

  async getTariff(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    tariffId: string,
  ): Promise<TariffResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${tariffId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'get',
      TariffResponse,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
    );
  }

  async putTariff(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    tariffId: string,
    tariff: Tariff,
  ): Promise<TariffResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${tariffId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'put',
      TariffResponse,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
      tariff,
    );
  }

  async deleteTariff(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    tariffId: string,
  ): Promise<OcpiEmptyResponse> {
    const path = `${fromCountryCode}/${fromPartyId}/${tariffId}`;
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      'delete',
      OcpiEmptyResponse,
      partnerProfile,
      true,
      `${this.getUrl(partnerProfile)}/${path}`,
    );
  }
}
