import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/response.url.repository';
import { AsyncReceiverApi } from '../trigger/AsyncReceiverApi';
import { ActiveChargingProfileResult } from '../model/ActiveChargingProfileResult';
import { ClearChargingProfileResult } from '../model/ChargingprofilesClearProfileResult';

@Service()
export class AsyncResponder {
  constructor(
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly asyncResponseApi: AsyncReceiverApi,
  ) {}

  async send(
    correlationId: string,
    data: ActiveChargingProfileResult | ClearChargingProfileResult,
  ) {
    const responseUrlEntity =
      await this.responseUrlRepo.getResponseUrl(correlationId);
    if (responseUrlEntity) {
      await this.asyncResponseApi.postAsyncResponse(
        responseUrlEntity.responseUrl,
        data,
      );
    } else {
      console.warn('No response url found for correlationId: ' + correlationId);
    }
  }
}
