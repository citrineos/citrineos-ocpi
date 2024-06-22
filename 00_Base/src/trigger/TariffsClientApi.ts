import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { Tariff } from '../model/Tariff';
import { GetTariffParams } from './param/tariffs/get.tariff.params';
import { PutTariffParams } from './param/tariffs/put.tariff.params';
import { DeleteTariffParams } from './param/tariffs/delete.tariff.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';

export class TariffsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tariffs;

  async getTariff(params: GetTariffParams): Promise<OcpiResponse<Tariff>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    const url = '{countryCode}/{partyId}/{tariffId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('tariffId', encodeURIComponent(params.tariffId));
    return await this.get<OcpiResponse<Tariff>>(
      {
        additionalHeaders,
      },
      url,
    );
  }

  async putTariff(params: PutTariffParams): Promise<OcpiResponse<Tariff>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'countryCode',
      'partyId',
      'tariffId',
      'tariff',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    const url = '{countryCode}/{partyId}/{tariffId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('tariffId', encodeURIComponent(params.tariffId));
    return await this.replace<OcpiResponse<Tariff>>(
      {
        additionalHeaders,
      },
      params.tariff,
      url,
    );
  }

  async deleteTariff(params: DeleteTariffParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    const url = '{countryCode}/{partyId}/{tariffId}'
      .replace('countryCode', encodeURIComponent(params.fromCountryCode))
      .replace('partyId', encodeURIComponent(params.fromPartyId))
      .replace('tariffId', encodeURIComponent(params.tariffId));
    return await this.del<OcpiResponse<void>>(
      {
        additionalHeaders,
      },
      url,
    );
  }
}
