import {Service} from "typedi";
import {ResponseUrlRepository} from "../repository/response-url.repository";
import {AsyncReceiverApi} from "../trigger/AsyncReceiverApi";

@Service()
export class AsyncResponder {
    constructor(
        readonly responseUrlRepo: ResponseUrlRepository,
        readonly asyncResponseApi: AsyncReceiverApi,
    ) {}

    async sendAsyncResponse(
        correlationId: string,
        data: any,
    ) {
        const responseUrlEntity =
            await this.responseUrlRepo.getResponseUrl(correlationId);
        if (responseUrlEntity) {
            await this.asyncResponseApi.postAsyncResponse(
                responseUrlEntity.responseUrl,
                data,
            );
        } else {
            console.warn("No response url found for correlationId: " + correlationId);
        }
    }
}
