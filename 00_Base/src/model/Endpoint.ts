import { IsString, IsNotEmpty, IsUrl } from "class-validator";
import { Enum } from "../util/decorators/Enum";
import { InterfaceRole } from "./InterfaceRole";
import { ModuleId } from "./ModuleId";
import { VersionNumber } from "./VersionNumber";

export class Endpoint {
  @IsString()
  @IsNotEmpty()
  identifier!: ModuleId;

  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;

  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @Enum(VersionNumber, 'VersionNumber')
  @IsNotEmpty()
  version!: string;
}