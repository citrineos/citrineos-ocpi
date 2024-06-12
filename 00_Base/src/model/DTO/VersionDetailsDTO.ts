import {ArrayMinSize, IsArray, IsNotEmpty} from "class-validator";
import {Enum} from "../../util/decorators/enum";
import {VersionNumber} from "../VersionNumber";
import {Type} from "class-transformer";
import {Endpoint, EndpointDTO} from "../Endpoint";

export class VersionDetailsDTO {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @Type(() => Endpoint)
  endpoints!: EndpointDTO[];
}
