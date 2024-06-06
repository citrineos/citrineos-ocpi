import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from "sequelize-typescript";
import {IsBoolean, IsNotEmpty, IsString} from "class-validator";
import {Version} from "./Version";
import {ClientCredentialsRole} from "./client.credentials.role";
import {CredentialsDTO} from "./CredentialsDTO";
import {CpoTenant} from "./cpo.tenant";
import {Exclude} from "class-transformer";

@Table
export class ClientInformation extends Model<any, any> {

  @Column({
    type: DataType.STRING,
    unique: true
  })
  @IsString()
  @IsNotEmpty()
  clientToken!: string;

  @Column({
    type: DataType.STRING,
    unique: true
  })
  @IsString()
  @IsNotEmpty()
  serverToken!: string;

  @Column(DataType.BOOLEAN)
  @IsBoolean()
  @IsNotEmpty()
  registered!: boolean;

  @Exclude()
  @HasMany(() => ClientCredentialsRole)
  clientCredentialsRoles!: ClientCredentialsRole[];

  @Exclude()
  @HasMany(() => Version)
  clientVersionDetails!: Version[];

  @Exclude()
  @HasMany(() => Version)
  serverVersionDetails!: Version[];

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  cpoTenantId!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  cpoTenant!: CpoTenant;

  public toCredentialsDTO(): CredentialsDTO {
    const credentials = new CredentialsDTO();
    credentials.token = this.clientToken;
    credentials.url = this.clientVersionDetails[0].url; // todo: what should this URL be?
    credentials.roles = this.clientCredentialsRoles;
    return credentials;
  }
}
