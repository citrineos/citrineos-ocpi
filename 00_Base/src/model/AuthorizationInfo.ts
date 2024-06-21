import { LocationReferences } from "./LocationReferences";
import { Displaytext } from "./Displaytext";
import { Token } from "./Token";
import { AuthorizationInfoAllowed } from "./AuthorizationInfoAllowed";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Optional } from "../util/decorators/optional";
import { Enum } from "../util/decorators/enum";

export class AuthorizationInfo {
  @Enum(AuthorizationInfoAllowed, "AuthorizationInfoAllowed")
  @IsNotEmpty()
  allowed!: AuthorizationInfoAllowed;

  @IsNotEmpty()
  @Type(() => Token)
  @ValidateNested()
  token!: Token;

  @IsString()
  authorizationReference!: string;

  @Optional()
  @Type(() => Displaytext)
  @ValidateNested()
  info?: Displaytext;

  @Optional()
  @Type(() => LocationReferences)
  @ValidateNested()
  location?: LocationReferences;
}
