import { Service } from 'typedi';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { PaginatedCdrResponse } from '../model/Cdr';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GET_TRANSACTIONS_QUERY } from '../graphql/queries/transaction.queries';

@Service()
export class CdrsService {
  constructor(private readonly ocpiGraphqlClient: OcpiGraphqlClient) {}

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
      toCountryCode,
      toPartyId,
      fromCountryCode,
      fromPartyId,
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
      offset,
      limit,
    };
    const result = await this.ocpiGraphqlClient.request<any>(
      GET_TRANSACTIONS_QUERY,
      variables,
    );
    const response = new PaginatedCdrResponse();
    response.data = result.Cdrs;
    response.total = result.Cdrs_aggregate?.aggregate?.count || 0;
    response.offset = offset;
    response.limit = limit;
    return response;
  }
}
