// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type { IDtoEvent, OcpiConfig } from '@citrineos/ocpi-base';
import {
  AbstractDtoModule,
  AsDtoEventHandler,
  DtoEventObjectType,
  DtoEventType,
  OcpiConfigToken,
  OcpiModule,
  RabbitMqDtoReceiver,
  Role,
  TariffsBroadcaster,
} from '@citrineos/ocpi-base';
import type { ILogObj } from 'tslog';
import { Logger } from 'tslog';
import { Inject, Service } from 'typedi';
import { TariffsModuleApi } from './module/TariffsModuleApi.js';
import type { TariffDto } from '@zetra/citrineos-base';
import {
  getTenantPartnerId,
  isPartnerReceivedTariff,
} from './tariffPartnerNotification.js';
import { logDbBroadcast } from '@citrineos/ocpi-base';
export { TariffsModuleApi } from './module/TariffsModuleApi.js';
export type { ITariffsModuleApi } from './module/ITariffsModuleApi.js';

@Service()
export class TariffsModule extends AbstractDtoModule implements OcpiModule {
  constructor(
    @Inject(OcpiConfigToken) config: OcpiConfig,
    logger: Logger<ILogObj>,
    readonly tariffsBroadcaster: TariffsBroadcaster,
  ) {
    super(config, new RabbitMqDtoReceiver(config, logger), logger);
  }

  getController(): any {
    return TariffsModuleApi;
  }

  async init(): Promise<void> {
    this._logger.info('Initializing Tariffs Module...');
    await this._receiver.init();
    this._logger.info('Tariffs Module initialized successfully.');
  }

  async shutdown(): Promise<void> {
    this._logger.info('Shutting down Tariffs Module...');
    await super.shutdown();
  }

  @AsDtoEventHandler(
    DtoEventType.INSERT,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffInsert(event: IDtoEvent<TariffDto>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Tariff Insert:', event);
    const tariffDto = event._payload;

    if (isPartnerReceivedTariff(tariffDto)) {
      this._logger.info(
        `Tariff ${tariffDto.id} received from partner (tenantPartnerId=${getTenantPartnerId(tariffDto)}), skipping broadcast.`,
      );
      return;
    }

    const tenant = tariffDto.tenant;
    await this.tariffsBroadcaster.broadcastPutTariff(tenant!, tariffDto);
  }

  @AsDtoEventHandler(
    DtoEventType.UPDATE,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffUpdate(
    event: IDtoEvent<Partial<TariffDto>>,
  ): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Tariff Update:', event);
    const tariffDto = event._payload;

    if (isPartnerReceivedTariff(tariffDto)) {
      this._logger.info(
        `Tariff ${tariffDto.id} received from partner (tenantPartnerId=${getTenantPartnerId(tariffDto)}), skipping broadcast.`,
      );
      return;
    }

    const tenant = tariffDto.tenant;
    await this.tariffsBroadcaster.broadcastPutTariff(tenant!, tariffDto);
  }

  @AsDtoEventHandler(
    DtoEventType.DELETE,
    DtoEventObjectType.Tariff,
    'TariffNotification',
  )
  async handleTariffDelete(event: IDtoEvent<TariffDto>): Promise<void> {
    logDbBroadcast(this._logger, 'debug', 'Handling Tariff Delete:', event);
    const tariffDto = event._payload;

    if (isPartnerReceivedTariff(tariffDto)) {
      this._logger.info(
        `Tariff ${tariffDto.id} received from partner (tenantPartnerId=${getTenantPartnerId(tariffDto)}), skipping broadcast.`,
      );
      return;
    }

    const tenant = tariffDto.tenant;
    await this.tariffsBroadcaster.broadcastTariffDeletion(tenant!, tariffDto);
  }
}
