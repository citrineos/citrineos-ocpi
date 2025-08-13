import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { ILogObj, Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITariffDto } from '@citrineos/base';
import { TariffResponseSchema } from '../model/Tariff';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tariffsClientApi: TariffsClientApi,
  ) {
    super();
  }

  private async broadcast(
    tariffDto: Partial<ITariffDto>,
    method: HttpMethod,
    action: string,
  ): Promise<void> {
    const tariffId = tariffDto.id;
    if (!tariffId) throw new Error('Tariff ID missing');
    const tenant = tariffDto.tenant;
    if (!tenant) {
      this.logger.error(
        `Tenant data missing in notification for Tariff ${tariffId}, cannot broadcast ${action}.`,
      );
      return;
    }
    // Debug log for raw payload
    this.logger.debug(
      `[TariffsBroadcaster] Raw payload for ${action}:`,
      tariffDto,
    );
    try {
      const params = {
        tariffId: tariffDto.id as number,
      };
      await this.tariffsClientApi.broadcastToClients({
        cpoCountryCode: tenant.countryCode!,
        cpoPartyId: tenant.partyId!,
        moduleId: ModuleId.Tariffs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: TariffResponseSchema,
        body: tariffDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(`broadcast${action} failed for Tariff ${tariffId}`, e);
    }
  }

  async broadcastPutTariff(tariffDto: ITariffDto): Promise<void> {
    await this.broadcast(tariffDto, HttpMethod.Put, 'PutTariff');
  }

  async broadcastPatchTariff(tariffDto: Partial<ITariffDto>): Promise<void> {
    await this.broadcast(tariffDto, HttpMethod.Patch, 'PatchTariff');
  }

  async broadcastTariffDeletion(tariffDto: ITariffDto): Promise<void> {
    await this.broadcast(tariffDto, HttpMethod.Delete, 'DeleteTariff');
  }
}
