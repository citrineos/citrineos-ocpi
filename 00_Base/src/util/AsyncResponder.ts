import { Service } from 'typedi';
import { ResponseUrlRepository } from '../repository/response.url.repository';
import { AsyncReceiverApi } from '../trigger/AsyncReceiverApi';
import { ActiveChargingProfileResult } from '../model/ActiveChargingProfileResult';
import { ClearChargingProfileResult } from '../model/ChargingprofilesClearProfileResult';
import { ChargingProfileResult } from '../model/ChargingProfileResult';
import { NotFoundError } from 'routing-controllers';
import { OcpiParams } from '../trigger/util/ocpi.params';
import { CommandResult } from '../model/CommandResult';
import { SessionMapper } from '../mapper/session.mapper';
import { SequelizeTransactionEventRepository } from '@citrineos/data';

@Service()
export class AsyncResponder {
  constructor(
    readonly responseUrlRepo: ResponseUrlRepository,
    readonly asyncResponseApi: AsyncReceiverApi,
    readonly sessionMapper: SessionMapper,
    readonly transactionRepo: SequelizeTransactionEventRepository,
  ) {}

  async send(
    correlationId: string,
    data:
      | ActiveChargingProfileResult
      | ClearChargingProfileResult
      | ChargingProfileResult
      | CommandResult,
    sessionId?: string,
  ) {
    const responseUrlEntity =
      await this.responseUrlRepo.getResponseUrl(correlationId);
    if (responseUrlEntity) {
      sessionId = sessionId ?? responseUrlEntity.sessionId;
      if (!sessionId) {
        throw new NotFoundError('Session Id not found');
      }

      // TODO: refactor to get session from session table directly when it is implemented
      const transaction =
        await this.transactionRepo.findByTransactionId(sessionId);
      if (!transaction) {
        throw new NotFoundError('Transaction not found');
      }
      const sessions = await this.sessionMapper.mapTransactionsToSessions([
        transaction,
      ]);
      if (sessions.length === 0) {
        throw new NotFoundError('Session not found');
      }
      const session = sessions[0];

      const params = new OcpiParams(
        session.country_code,
        session.party_id,
        session.cdr_token.country_code,
        session.cdr_token.party_id,
      );
      await this.asyncResponseApi.postAsyncResponse(
        responseUrlEntity.responseUrl,
        data,
        params,
      );
    } else {
      throw new NotFoundError(
        'No response url found for correlationId: ' + correlationId,
      );
    }
  }
}
