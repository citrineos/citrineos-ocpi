import { Body, JsonController, Post } from 'routing-controllers';
import {
  BaseController,
  TariffKey,
  TariffsBroadcaster,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { ITariffsModuleApi } from './interface';

@Service()
@JsonController(`/tariff-broadcasts`)
export class TariffsModuleApi
  extends BaseController
  implements ITariffsModuleApi
{
  constructor(readonly tariffsPublisher: TariffsBroadcaster) {
    super();
  }

  @Post()
  async broadcastTariff(
    @Body()
    broadcastRequest: TariffKey & {
      eventType: 'created' | 'updated' | 'deleted';
    },
  ): Promise<void> {
    console.log(`Request to broadcast ${broadcastRequest}`);

    switch (broadcastRequest.eventType) {
      case 'deleted':
        return this.tariffsPublisher.broadcastDeletionByKey(broadcastRequest);
      case 'updated':
        return this.tariffsPublisher.broadcastByKey(broadcastRequest);
      case 'created':
        return this.tariffsPublisher.broadcastByKey(broadcastRequest);
      default:
        // const _exhaustiveCheck: never = broadcastRequest.eventType;
        return Promise.resolve();
    }
  }
}
