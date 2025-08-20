import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { ILogObj, Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITariffDto, ITenantDto } from '@citrineos/base';
import { Tariff, TariffResponseSchema } from '../model/Tariff';
import { TariffMapper } from '../mapper/TariffMapper';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tariffsClientApi: TariffsClientApi,
  ) {
    super();
  }

  private async broadcast(
    tenant: ITenantDto,
    method: HttpMethod,
    path: string,
    tariff?: Partial<Tariff>,
  ): Promise<void> {
    try {
      await this.tariffsClientApi.broadcastToClients({
        cpoCountryCode: tenant.countryCode!,
        cpoPartyId: tenant.partyId!,
        moduleId: ModuleId.Tariffs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: TariffResponseSchema,
        body: tariff,
        path: path,
      });
    } catch (e) {
      this.logger.error(`broadcast${method} failed for Tariff ${path}`, e);
    }
  }

  async broadcastPutTariff(tenant: ITenantDto, tariffDto: Partial<ITariffDto>): Promise<void> {
    const tariff = TariffMapper.map(tariffDto);
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariff.id}`;
    await this.broadcast(tenant, HttpMethod.Put, path, tariff);
  }

  async broadcastTariffDeletion(tenant: ITenantDto, tariffDto: ITariffDto): Promise<void> {
    const path = `/${tenant.countryCode}/${tenant.partyId}/${tariffDto.id}`;
    await this.broadcast(tenant, HttpMethod.Delete, path);
  }
}
