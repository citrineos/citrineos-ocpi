import { Service } from 'typedi';
import {
  SequelizeTransactionEventRepository,
  Transaction,
} from '@citrineos/data';
import { CredentialsService } from '../services/credentials.service';
import { ILogObj, Logger } from 'tslog';
import { BaseBroadcaster } from './BaseBroadcaster';
import { ModuleId } from '../model/ModuleId';
import { CdrMapper } from '../mapper/cdr.mapper';
import { Cdr } from '../model/Cdr';
import { CdrsClientApi } from '../trigger/CdrsClientApi';
import { PostCdrParams } from '../trigger/param/cdrs/post.cdr.params';

@Service()
export class CdrBroadcaster extends BaseBroadcaster {
  constructor(
    readonly logger: Logger<ILogObj>,
    readonly transactionRepository: SequelizeTransactionEventRepository,
    readonly cdrMapper: CdrMapper,
    readonly cdrsClientApi: CdrsClientApi,
    readonly credentialsService: CredentialsService,
  ) {
    super(logger, credentialsService);
    this.transactionRepository.transaction.on('updated', (transactions) =>
      this.broadcast(
        transactions.filter(
          (transaction) =>
            transaction.transactionEvents?.some(
              (event) => event.eventType === 'Ended',
            ) ?? false,
        ),
      ),
    );
  }

  private async broadcast(transactions: Transaction[]) {
    const cdrs: Cdr[] =
      await this.cdrMapper.mapTransactionsToCdrs(transactions);

    for (const cdr of cdrs) {
      await this.sendCdrToClients(cdr);
    }
  }

  private async sendCdrToClients(cdr: Cdr): Promise<void> {
    const params = PostCdrParams.build(cdr);
    const cpoCountryCode = cdr.country_code;
    const cpoPartyId = cdr.party_id;
    await this.broadcastToClients(
      cpoCountryCode,
      cpoPartyId,
      ModuleId.Cdrs,
      params,
      this.cdrsClientApi,
      this.cdrsClientApi.postCdr,
    );
  }
}
