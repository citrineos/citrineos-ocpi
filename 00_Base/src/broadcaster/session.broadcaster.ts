import {Service} from 'typedi';
import {Session} from '../model/Session';
import {SessionsClientApi} from '../trigger/SessionsClientApi';
import {PutSessionParams} from '../trigger/param/sessions/put.session.params';
import {SequelizeTransactionEventRepository, Transaction,} from '@citrineos/data';
import {SessionMapper} from '../mapper/session.mapper';
import {CredentialsService} from '../services/credentials.service';
import {ILogObj, Logger} from "tslog";
import {BaseBroadcaster} from "./BaseBroadcaster";
import {VersionNumber} from "../model/VersionNumber";

@Service()
export class SessionBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly sessionMapper: SessionMapper,
    readonly sessionsClientApi: SessionsClientApi,
    readonly credentialsService: CredentialsService,
  ) {
    super(logger, credentialsService);
    this.transactionRepository.transaction.on('created', (transactions) =>
      this.broadcast(transactions),
    );
    this.transactionRepository.transaction.on('updated', (transactions) =>
      this.broadcast(transactions),
    );
  }

  private async broadcast(transactions: Transaction[]) {
    // todo do we know if we can do put vs patch here, is there a way to have a delta?
    const sessions: Session[] =
      await this.sessionMapper.mapTransactionsToSessions(transactions);

    for (const session of sessions) {
      await this.sendSessionToClients(session);
    }
  }

  private async sendSessionToClients(session: Session): Promise<void> {
    const cpoCountryCode = session.country_code;
    const cpoPartyId = session.party_id;
    const requiredOcpiParams = await this.getRequiredOcpiParams(cpoCountryCode, cpoPartyId);
    if (requiredOcpiParams.length === 0) {
      this.logger.error("requiredOcpiParams empty");
      return; // todo
    }
    for (const requiredOcpiParam of requiredOcpiParams) {
      try {
        const params = PutSessionParams.build(
          session.country_code,
          session.party_id,
          requiredOcpiParam.clientCountryCode,
          requiredOcpiParam.clientPartyId,
          requiredOcpiParam.authToken,
          "xRequestId", // todo
          "xCorrelationId", // todo
          VersionNumber.TWO_DOT_TWO_DOT_ONE,
          session.id,
          session,
        );
        this.sessionsClientApi.baseUrl = requiredOcpiParam.clientUrl;
        const response = await this.sessionsClientApi.putSession(params);
        this.logger.info("putSession response: " + response);
      } catch (e) {
        // todo
        this.logger.error(e);
      }
    }
  }
}
