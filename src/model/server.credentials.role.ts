import {BelongsTo, Column, DataType, ForeignKey, HasOne, Table} from "sequelize-typescript";
import {Role} from "./Role";
import {CredentialsRole} from "./CredentialsRole";
import {IsNotEmpty, IsString, Length} from "class-validator";
import {CpoTenant} from "./cpo.tenant";
import {BusinessDetails} from "./BusinessDetails";
import {Exclude} from "class-transformer";
import {ON_DELETE_CASCADE} from "../util/sequelize";


@Table
export class ServerCredentialsRole extends CredentialsRole {
  @Column(DataType.ENUM(Role.CPO))
  role = Role.CPO;

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  party_id!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country_code!: string;

  @Exclude()
  @HasOne(() => BusinessDetails, {
    onDelete: ON_DELETE_CASCADE,
  })
  business_details!: BusinessDetails;

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  cpoTenantId!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  cpoTenant!: CpoTenant;

  static buildServerCredentialsRole(
    countryCode: string,
    partyId: string,
    businessDetails: BusinessDetails
  ) {
    const serverCredentialsRole = new ServerCredentialsRole();
    serverCredentialsRole.country_code = countryCode;
    serverCredentialsRole.party_id = partyId;
    serverCredentialsRole.business_details = businessDetails;
    return serverCredentialsRole;
  }
}
