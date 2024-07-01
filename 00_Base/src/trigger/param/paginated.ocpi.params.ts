import { IsDateString, IsInt, Min } from 'class-validator';
import { Optional } from '../../util/decorators/optional';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../../model/PaginatedResponse';
import { OcpiParams } from '../util/ocpi.params';

export class PaginatedOcpiParams extends OcpiParams {
  @IsInt()
  @Min(0)
  @Optional()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @Min(1)
  @Optional()
  limit?: number = DEFAULT_LIMIT;

  @IsDateString()
  @Optional()
  private _date_from?: string;

  @IsDateString()
  @Optional()
  private _date_to?: string;

  get date_from(): Date {
    return new Date(this._date_from!);
  }

  get date_to(): Date {
    return new Date(this._date_to!);
  }

  set date_from(value: Date) {
    this._date_from = value.toISOString();
  }

  set date_to(value: Date) {
    this._date_to = value.toISOString();
  }
}

export const buildPaginatedOcpiParams = (
  toCountryCode: string,
  toPartyId: string,
  fromCountryCode: string,
  fromPartyId: string,
  offset?: number,
  limit?: number,
  dateFrom?: Date,
  dateTo?: Date,
): PaginatedOcpiParams => {
  const params = new OcpiParams();
  params.fromCountryCode = fromCountryCode;
  params.fromPartyId = fromPartyId;
  params.toCountryCode = toCountryCode;
  params.toPartyId = toPartyId;
  (params as PaginatedOcpiParams).limit = limit ?? DEFAULT_LIMIT;
  (params as PaginatedOcpiParams).offset = offset ?? DEFAULT_OFFSET;
  if (dateFrom) {
    (params as PaginatedOcpiParams).date_from = dateFrom;
  }
  if (dateTo) {
    (params as PaginatedOcpiParams).date_to = dateTo;
  }
  console.log(
    `Built PaginatedOcpiParams: ${JSON.stringify(params as PaginatedOcpiParams)}`,
  );
  return params as PaginatedOcpiParams;
};
