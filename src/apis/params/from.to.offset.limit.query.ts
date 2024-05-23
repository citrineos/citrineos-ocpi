import {IsDateString, IsInt} from 'class-validator';
import {Optional} from '../../util/decorators/optional';

export class FromToOffsetLimitQuery {
  @IsDateString()
  @Optional()
  private _date_from?: string;
  get date_from(): Date {
    return new Date(this._date_from!);
  }

  set date_from(value: Date) {
    this._date_from = value.toISOString();
  }

  @IsDateString()
  @Optional()
  private _date_to?: string;
  get date_to(): Date {
    return new Date(this._date_to!);
  }

  set date_to(value: Date) {
    this._date_to = value.toISOString();
  }

  @IsInt()
  @Optional()
  offset?: number;

  @IsInt()
  @Optional()
  limit?: number = 10;
}
