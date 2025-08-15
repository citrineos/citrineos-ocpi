import { BaseBroadcaster } from './BaseBroadcaster';
import { Service } from 'typedi';
import { SessionsClientApi } from '../trigger/SessionsClientApi';
import { ILogObj, Logger } from 'tslog';
import { SessionResponseSchema } from '../model/Session';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { HttpMethod, IMeterValueDto, ITransactionDto } from '@citrineos/base';
import { ChargingPeriod } from '../model/ChargingPeriod';

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly sessionsClientApi: SessionsClientApi,
  ) {
    super();
  }

  async broadcastPutSession(transactionDto: ITransactionDto): Promise<void> {
    await this.broadcastSession(transactionDto, HttpMethod.Put);
  }

  async broadcastPatchSession(
    transactionDto: Partial<ITransactionDto>,
  ): Promise<void> {
    await this.broadcastSession(transactionDto, HttpMethod.Patch);
  }

  private async broadcastSession(
    transactionDto: Partial<ITransactionDto>,
    method: HttpMethod,
  ): Promise<void> {
    const sessionId = transactionDto.id;
    if (!sessionId) throw new Error('Session ID missing');

    const params = { sessionId };

    try {
      await this.sessionsClientApi.broadcastToClients({
        cpoCountryCode: transactionDto.tenant?.countryCode || '',
        cpoPartyId: transactionDto.tenant?.partyId || '',
        moduleId: ModuleId.Sessions,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: SessionResponseSchema,
        body: transactionDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Session failed for Session ${sessionId}`,
        e,
      );
    }
  }

  async broadcastPatchSessionChargingPeriod(
    transactionDto: IMeterValueDto & { charging_periods: ChargingPeriod[] },
  ): Promise<void> {
    const method = HttpMethod.Patch;
    const transactionId = transactionDto.transactionId;
    if (!transactionId) throw new Error('Transaction ID missing');
    const params = { transactionId };
    try {
      await this.sessionsClientApi.broadcastToClients({
        cpoCountryCode: transactionDto.tenant?.countryCode || '',
        cpoPartyId: transactionDto.tenant?.partyId || '',
        moduleId: ModuleId.Sessions,
        interfaceRole: InterfaceRole.SENDER,
        httpMethod: method,
        schema: SessionResponseSchema,
        body: transactionDto,
        otherParams: params,
      });
    } catch (e) {
      this.logger.error(
        `broadcast${method}Session failed for Session ${transactionId}`,
        e,
      );
    }
  }
}
