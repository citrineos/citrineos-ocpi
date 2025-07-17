import { Service } from 'typedi';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { PaginatedCdrResponse } from '../model/Cdr';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { CdrMapper } from '../mapper/CdrMapper';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';
import { GetTransactionsQuery } from '../graphql/types/graphql';
import { ITransactionDto } from '@citrineos/base';

@Service()
export class CdrsService {
  constructor(
    private readonly ocpiGraphqlClient: OcpiGraphqlClient,
    private readonly cdrMapper: CdrMapper,
  ) {}

  public async getCdrs(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedCdrResponse> {
    const variables = {
      cpoCountryCode: toCountryCode,
      cpoPartyId: toPartyId,
      mspCountryCode: fromCountryCode,
      mspPartyId: fromPartyId,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
      offset,
      limit,
    };
    const result = await this.ocpiGraphqlClient.request<GetTransactionsQuery>(
      GET_TRANSACTIONS_QUERY,
      variables,
    );
    const mappedCdr = await this.cdrMapper.mapTransactionsToCdrs(
      result.Transactions as unknown as ITransactionDto[],
    );

    const response = new PaginatedCdrResponse();
    response.data = mappedCdr;
    response.total = result.Transactions_aggregate.aggregate?.count || 0;
    response.offset = offset;
    response.limit = limit;
    return response;
  }
}
