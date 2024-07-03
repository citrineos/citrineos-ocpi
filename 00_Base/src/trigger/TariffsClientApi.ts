import { BaseClientApi } from './BaseClientApi';
import { TariffResponse } from '../model/Tariff';
import { GetTariffParams } from './param/tariffs/get.tariff.params';
import { PutTariffParams } from './param/tariffs/put.tariff.params';
import { DeleteTariffParams } from './param/tariffs/delete.tariff.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';
import { OcpiEmptyResponse } from '../model/ocpi.empty.response';

export class TariffsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tariffs;

  async getTariff(params: GetTariffParams): Promise<TariffResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get(TariffResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tariffId', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }

  async putTariff(params: PutTariffParams): Promise<TariffResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'tariffId',
      'tariff',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace(
      TariffResponse,
      {
        version: params.version,
        path: '{countryCode}/{partyId}/{tariffId}'
          .replace('countryCode', encodeURIComponent(params.fromCountryCode))
          .replace('partyId', encodeURIComponent(params.fromPartyId))
          .replace('tariffId', encodeURIComponent(params.tariffId)),
        additionalHeaders,
      },
      params.tariff,
    );
  }

  async deleteTariff(params: DeleteTariffParams): Promise<OcpiEmptyResponse> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.del(OcpiEmptyResponse, {
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tariffId', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }
}
