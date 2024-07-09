import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/optional';
import { ResponseUrl } from './ResponseUrl';
import { TokenDTO } from './DTO/TokenDTO';

export class StartSession extends ResponseUrl {
  @IsObject()
  @IsNotEmpty()
  @Type(() => TokenDTO)
  @ValidateNested()
  token!: TokenDTO;

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
  connector_id?: string | null;

  @MaxLength(36)
  @IsString()
  @Optional()
  authorization_reference?: string | null;
}
