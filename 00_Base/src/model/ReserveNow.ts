import { IsDate, IsNotEmpty, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';
import { ResponseUrl } from './ResponseUrl';
import { TokenDTO } from './DTO/TokenDTO';

export class ReserveNow extends ResponseUrl {
  @IsObject()
  @IsNotEmpty()
  @Type(() => TokenDTO)
  @ValidateNested()
  token!: TokenDTO;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  expiry_date!: Date;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  reservation_id!: string;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  location_id!: string;

  @MaxLength(36)
  @IsString()
  @Optional()
  evse_uid?: string | null;

  @MaxLength(36)
  @IsString()
  @Optional()
  authorization_reference?: string | null;
}
