import {IsNotEmpty, IsString, IsUrl} from "class-validator";
import {Enum} from "../util/decorators/enum";
import {VersionNumber} from "./VersionNumber";

export class VersionDTO {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsString()
  @IsUrl({require_tld: false})
  url!: string;
}
