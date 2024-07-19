import { Inject, Service } from 'typedi';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { Cdr, PaginatedCdrResponse } from '../model/Cdr';
import { ICdrsDatasource } from '../datasources/ICdrsDatasource';
import { CDR_DATASOURCE_SERVICE_TOKEN } from '../datasources/CdrsDatasource';

@Service()
export class CdrsService {
  constructor(
    @Inject(CDR_DATASOURCE_SERVICE_TOKEN)
    private readonly cdrsDatasource: ICdrsDatasource
  ) {
  }

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
    const result = await this.cdrsDatasource.getCdrs(toCountryCode, toPartyId, fromCountryCode, fromPartyId, dateFrom, dateTo, offset, limit);

    const response = new PaginatedCdrResponse();
    response.data = result.data;
    response.total = result.total;
    response.offset = offset;
    response.limit = limit;

    return response;
  }

  private filterBasedOnCountryCodePartyId(
    cdrs: Cdr[],
    fromCountryCode?: string,
    fromPartyId?: string,
    toCountryCode?: string,
    toPartyId?: string
  ): Cdr[] {
    let filteredCdrs = cdrs;
    if (fromCountryCode && fromPartyId) {
      filteredCdrs = filteredCdrs.filter(cdr => cdr.cdr_token?.country_code === fromCountryCode && cdr.cdr_token?.party_id === fromPartyId);
    }

    if (toCountryCode && toPartyId) {
      filteredCdrs = filteredCdrs.filter(cdr => cdr.country_code === toCountryCode && cdr.party_id === toPartyId);
    }

    return filteredCdrs;
  }
}
