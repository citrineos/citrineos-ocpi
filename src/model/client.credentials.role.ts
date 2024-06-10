import {BelongsTo, Column, DataType, ForeignKey, HasOne, Table} from "sequelize-typescript";
import {Role} from "./Role";
import {CredentialsRole} from "./CredentialsRole";
import {IsNotEmpty, IsString, Length} from "class-validator";
import {ClientInformation} from "./client.information";
import {CpoTenant} from "./cpo.tenant";
import {BusinessDetails} from "./BusinessDetails";
import {Exclude} from "class-transformer";
import {ON_DELETE_CASCADE} from "../util/sequelize";

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
  country_code!: string; // todo should we use CountryCode enum?

  @Exclude()
  @HasOne(() => BusinessDetails, {
    onDelete: ON_DELETE_CASCADE,
  })
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


  static buildClientCredentialsRole(
    countryCode: string,
    partyId: string,
    businessDetails: BusinessDetails
  ) {
    const clientCredentialsRole = new ClientCredentialsRole();
    clientCredentialsRole.country_code = countryCode;
    clientCredentialsRole.party_id = partyId;
    clientCredentialsRole.business_details = businessDetails;
    return clientCredentialsRole;
  }
}
