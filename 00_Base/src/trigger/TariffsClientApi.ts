import { BaseClientApi } from './BaseClientApi';
import { TariffResponse } from '../model/Tariff';
import { GetTariffParams } from './param/tariffs/GetTariffParams';
import { PutTariffParams } from './param/tariffs/PutTariffParams';
import { DeleteTariffParams } from './param/tariffs/DeleteTariffParams';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';
import { OcpiEmptyResponse } from '../model/OcpiEmptyResponse';
import { Service } from 'typedi';

@Service()
export class TariffsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tariffs;

  constructor() {
    super();
  }

  async getTariff(params: GetTariffParams): Promise<TariffResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(TariffResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('{countryCode}', encodeURIComponent(params.fromCountryCode))
        .replace('{partyId}', encodeURIComponent(params.fromPartyId))
        .replace('{tariffId}', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }

  async putTariff(params: PutTariffParams): Promise<TariffResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'tariffId', 'tariff');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace(
      TariffResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{tariffId}'
          .replace('{countryCode}', encodeURIComponent(params.fromCountryCode))
          .replace('{partyId}', encodeURIComponent(params.fromPartyId))
          .replace('{tariffId}', encodeURIComponent(params.tariffId)),
        additionalHeaders,
      },
      params.tariff,
    );
  }

  async deleteTariff(params: DeleteTariffParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.del(OcpiEmptyResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('{countryCode}', encodeURIComponent(params.fromCountryCode))
        .replace('{partyId}', encodeURIComponent(params.fromPartyId))
        .replace('{tariffId}', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }
}
