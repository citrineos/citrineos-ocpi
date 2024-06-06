import {BelongsTo, Column, DataType, ForeignKey, HasOne, Table} from "sequelize-typescript";
import {Role} from "./Role";
import {CredentialsRole} from "./CredentialsRole";
import {IsNotEmpty, IsString, Length} from "class-validator";
import {ClientInformation} from "./client.information";
import {CpoTenant} from "./cpo.tenant";
import {BusinessDetails} from "./BusinessDetails";
import {Exclude} from "class-transformer";

@Table
export class ClientCredentialsRole extends CredentialsRole { // todo seems like CredentialsRole base may be better fit as an interface
  @Column(DataType.ENUM(Role.EMSP))
  role = Role.EMSP;

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
  @HasOne(() => BusinessDetails)
  business_details!: BusinessDetails;

  @Exclude()
  @ForeignKey(() => ClientInformation)
  @Column(DataType.INTEGER)
  clientInformationId!: number;

  @Exclude()
  @BelongsTo(() => ClientInformation)
  clientInformation!: ClientInformation;

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  cpoTenantId!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  cpoTenant!: CpoTenant;
}
