import { Inject, Service } from 'typedi';
import { PaginatedSessionResponse } from '../model/Session';
import { buildOcpiPaginatedResponse, DEFAULT_LIMIT, DEFAULT_OFFSET } from '../model/PaginatedResponse';
import { OcpiResponseStatusCode } from '../model/OcpiResponse';
import { ISessionsDatasource } from '../datasources/ISessionsDatasource';
import { SESSION_DATASOURCE_SERVICE_TOKEN } from '../datasources/SessionsDatasource';

@Service()
export class SessionsService {
  constructor(
    @Inject(SESSION_DATASOURCE_SERVICE_TOKEN)
    private readonly sessionsDatasource: ISessionsDatasource,
  ) {}

  public async getSessions(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    offset: number = DEFAULT_OFFSET,
    limit: number = DEFAULT_LIMIT,
  ): Promise<PaginatedSessionResponse> {
    const result = await this.sessionsDatasource.getSessions(
      toCountryCode,
      toPartyId,
      fromCountryCode,
      fromPartyId,
      dateFrom,
      dateTo,
      offset,
      limit,
    );

    const response = buildOcpiPaginatedResponse(
      OcpiResponseStatusCode.GenericSuccessCode,
      result.total,
      limit,
      offset,
      result.data,
    );

    return response as PaginatedSessionResponse;
  }
}
