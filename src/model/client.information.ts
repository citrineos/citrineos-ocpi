import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from "sequelize-typescript";
import {IsBoolean, IsNotEmpty, IsString} from "class-validator";
import {ClientCredentialsRole} from "./client.credentials.role";
import {CredentialsDTO} from "./CredentialsDTO";
import {CpoTenant} from "./cpo.tenant";
import {Exclude} from "class-transformer";
import {ClientVersion} from "./client.version";
import {ServerVersion} from "./server.version";

@Table
export class ClientInformation extends Model {

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
  @HasMany(() => ClientVersion)
  clientVersionDetails!: ClientVersion[];

  @Exclude()
  @HasMany(() => ServerVersion)
  serverVersionDetails!: ServerVersion[];

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  cpoTenantId!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  cpoTenant!: CpoTenant;

  static buildClientInformation(
    clientToken: string,
    serverToken: string,
    registered: boolean,
    clientCredentialsRoles: ClientCredentialsRole[],
    clientVersionDetails: ClientVersion[],
    serverVersionDetails: ServerVersion[],
  ): ClientInformation {
    const clientInformation = new ClientInformation();
    clientInformation.clientToken = clientToken;
    clientInformation.serverToken = serverToken;
    clientInformation.registered = registered;
    clientInformation.clientCredentialsRoles = clientCredentialsRoles;
    clientInformation.clientVersionDetails = clientVersionDetails;
    clientInformation.serverVersionDetails = serverVersionDetails;
    return clientInformation;
  }

  public toCredentialsDTO(): CredentialsDTO {
    const credentials = new CredentialsDTO();
    credentials.token = this.clientToken;
    credentials.url = this.clientVersionDetails[0].url; // todo: what should this URL be?
    credentials.roles = this.clientCredentialsRoles;
    return credentials;
  }
}
