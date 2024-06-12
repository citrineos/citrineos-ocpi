import {IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested} from "class-validator";
import {Optional} from "../../util/decorators/optional";
import {Type} from "class-transformer";
import {ImageDTO} from "./ImageDTO";

export class BusinessDetailsDTO {

  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsUrl({require_tld: false})
  @Optional()
  website?: string | null;

  @Optional()
  @Type(() => ImageDTO)
  @ValidateNested()
  logo?: ImageDTO | null;
}
