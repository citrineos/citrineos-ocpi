import {OcpiParams} from '../../util/ocpi.params';
import {TokenType} from '../../../model/TokenType';
import {IsNotEmpty, IsString, Length, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {LocationReferences} from '../../../model/LocationReferences';
import {Enum} from "../../../util/decorators/enum";
import {Optional} from "../../../util/decorators/optional";

export class PostTokenParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tokenId!: string;

  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type?: TokenType;

  @Optional()
  @Type(() => LocationReferences)
  @ValidateNested()
  locationReferences?: LocationReferences;
}
