import { BaseClientApi } from './BaseClientApi';
import { OcpiResponse } from '../model/ocpi.response';
import { GetTariffParams } from './param/tariffs/get.tariff.params';
import { PutTariffParams } from './param/tariffs/put.tariff.params';
import { DeleteTariffParams } from './param/tariffs/delete.tariff.params';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { ModuleId } from '../model/ModuleId';
import {Service} from "typedi";
import {TariffDTO} from "../model/DTO/TariffDTO";

@Service()
export class TariffsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Tariffs;

  async getTariff(params: GetTariffParams): Promise<OcpiResponse<TariffDTO>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'countryCode', 'partyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.get<OcpiResponse<TariffDTO>>({
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tariffId', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }

  async putTariff(params: PutTariffParams): Promise<OcpiResponse<TariffDTO>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(
      params,
      'fromCountryCode',
      'fromPartyId',
      'tariffId',
      'tariff',
    );
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.replace<OcpiResponse<TariffDTO>>(
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

  async deleteTariff(params: DeleteTariffParams): Promise<OcpiResponse<void>> {
    this.validateOcpiParams(params);
    this.validateRequiredParam(params, 'fromCountryCode', 'fromPartyId', 'tariffId');
    const additionalHeaders: IHeaders = this.getOcpiHeaders(params);
    return await this.del<OcpiResponse<void>>({
      version: params.version,
      path: '{countryCode}/{partyId}/{tariffId}'
        .replace('countryCode', encodeURIComponent(params.fromCountryCode))
        .replace('partyId', encodeURIComponent(params.fromPartyId))
        .replace('tariffId', encodeURIComponent(params.tariffId)),
      additionalHeaders,
    });
  }
}
