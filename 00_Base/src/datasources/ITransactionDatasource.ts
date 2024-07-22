import { PaginatedResult } from '../model/PaginatedResult';
import { Transaction } from '@citrineos/data';

export interface ITransactionDatasource {
  getTransactions(
    cpoCountryCode: string,
    cpoPartyId: string,
    mspCountryCode: string,
    mspPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset?: number,
    limit?: number,
    endedOnly?: boolean,
  ): Promise<PaginatedResult<Transaction>>;
}
