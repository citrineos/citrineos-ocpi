import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { ILogObj, Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITariffDto } from '@citrineos/base';
import { PutTariffParams } from '../trigger/param/tariffs/PutTariffParams';
import { DeleteTariffParams } from '../trigger/param/tariffs/DeleteTariffParams';
import { TariffResponseSchema } from '../model/Tariff';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tariffsClientApi: TariffsClientApi,
  ) {
    super();
  }

  async broadcastPutTariff(tariffDto: ITariffDto): Promise<void> {
    await this.broadcastTariff(tariffDto, HttpMethod.Put);
  }

  async broadcastPatchTariff(tariffDto: Partial<ITariffDto>): Promise<void> {
    await this.broadcastTariff(tariffDto, HttpMethod.Patch);
  }

  private async broadcastTariff(
    tariffDto: Partial<ITariffDto>,
    method: HttpMethod,
  ): Promise<void> {
    const tariffId = tariffDto.id;
    if (!tariffId) throw new Error('Tariff ID missing');

    const params: PutTariffParams = {
      tariffId,
    } as unknown as PutTariffParams;

    try {
      await this.tariffsClientApi.broadcastToClients({
        cpoCountryCode: tariffDto.tenant?.countryCode!,
        cpoPartyId: tariffDto.tenant?.partyId!,
        moduleId: ModuleId.Tariffs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: TariffResponseSchema,
        body: tariffDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Tariff failed for Tariff ${tariffId}`,
        e,
      );
    }
  }

  async broadcastTariffDeletion(tariffDto: ITariffDto): Promise<void> {
    const tariffId = tariffDto.id;
    if (!tariffId) throw new Error('Tariff ID missing');

    const params: DeleteTariffParams = {
      tariffId,
    } as unknown as DeleteTariffParams;

    try {
      await this.tariffsClientApi.broadcastToClients({
        cpoCountryCode: tariffDto.tenant?.countryCode!,
        cpoPartyId: tariffDto.tenant?.partyId!,
        moduleId: ModuleId.Tariffs,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: HttpMethod.Delete,
        schema: TariffResponseSchema,
        body: tariffDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcastDeleteTariff failed for Tariff ${tariffId}`,
        e,
      );
    }
  }
}
