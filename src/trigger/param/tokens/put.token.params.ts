import {OcpiParams} from "../../util/ocpi.params";
import {Token} from "../../../model/Token";
import {TokenType} from "../../../model/TokenType";
import {IsNotEmpty, IsString, Length, ValidateNested} from "class-validator";
import {Enum} from "../../../util/decorators/enum";
import {Type} from "class-transformer";

export class PutTokenParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tokenId!: string;

  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type?: TokenType;

  @IsNotEmpty()
  @Type(() => Token)
  @ValidateNested()
  token!: Token;
}
