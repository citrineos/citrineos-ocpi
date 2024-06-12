import {Enum} from "../../util/decorators/enum";
import {Role} from "../Role";
import {IsNotEmpty, IsString, Length, ValidateNested} from "class-validator";
import {Type} from "class-transformer";
import {BusinessDetailsDTO} from "./BusinessDetailsDTO";

export class CredentialsRoleDTO {
  @Enum(Role, 'Role')
  @IsNotEmpty()
  role!: Role;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  party_id!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country_code!: string; // todo should we use CountryCode enum?

  @IsNotEmpty()
  @Type(() => BusinessDetailsDTO)
  @ValidateNested()
  business_details!: BusinessDetailsDTO;
}
