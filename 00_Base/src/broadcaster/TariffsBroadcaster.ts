import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { TariffsClientApi } from '../trigger/TariffsClientApi';
import { ILogObj, Logger } from 'tslog';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, ITariffDto, ITenantDto } from '@citrineos/base';
import { PutTariffParams } from '../trigger/param/tariffs/PutTariffParams';
import { DeleteTariffParams } from '../trigger/param/tariffs/DeleteTariffParams';
import { TariffResponseSchema } from '../model/Tariff';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  GetTenantByIdQueryResult,
  GetTenantByIdQueryVariables,
} from '../graphql/operations';
import { GET_TENANT_BY_ID } from '../graphql/queries/tenantVersionEndpoints.queries';

@Service()
export class TariffsBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly tariffsClientApi: TariffsClientApi,
    private ocpiGraphqlClient: OcpiGraphqlClient,
  ) {
    super();
  }

  private async getTenant(tenantId: number): Promise<ITenantDto | null> {
    try {
      const response = await this.ocpiGraphqlClient.request<
        GetTenantByIdQueryResult,
        GetTenantByIdQueryVariables
      >(GET_TENANT_BY_ID, { id: tenantId });
      return response.Tenants[0] as ITenantDto;
    } catch (e) {
      this.logger.error(`Failed to fetch tenant for tenantId ${tenantId}`, e);
      return null;
    }
  }

  private async broadcast(
    tariffDto: Partial<ITariffDto>,
    method: HttpMethod,
    params: PutTariffParams | DeleteTariffParams,
    action: string,
  ): Promise<void> {
    const tariffId = tariffDto.id;
    if (!tariffId) throw new Error('Tariff ID missing');
    if (!tariffDto.tenantId) {
      this.logger.error(
        `Tariff ${tariffId} has no tenantId, cannot broadcast ${action}.`,
      );
      return;
    }
    // Debug log for raw payload
    this.logger.debug(
      `[TariffsBroadcaster] Raw payload for ${action}:`,
      tariffDto,
    );
    const tenant = await this.getTenant(tariffDto.tenantId);
    if (!tenant) {
      this.logger.error(`Tenant not found for tenantId ${tariffDto.tenantId}`);
      return;
    }
    try {
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
    const params: PutTariffParams = {
      tariffId: tariffDto.id,
    } as unknown as PutTariffParams;
    await this.broadcast(tariffDto, HttpMethod.Put, params, 'PutTariff');
  }

  async broadcastPatchTariff(tariffDto: Partial<ITariffDto>): Promise<void> {
    const params: PutTariffParams = {
      tariffId: tariffDto.id,
    } as unknown as PutTariffParams;
    await this.broadcast(tariffDto, HttpMethod.Patch, params, 'PatchTariff');
  }

  async broadcastTariffDeletion(tariffDto: ITariffDto): Promise<void> {
    const params: DeleteTariffParams = {
      tariffId: tariffDto.id,
    } as unknown as DeleteTariffParams;
    await this.broadcast(tariffDto, HttpMethod.Delete, params, 'DeleteTariff');
  }
}
