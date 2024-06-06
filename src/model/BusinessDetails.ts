import {IsNotEmpty, IsString, IsUrl, MaxLength} from 'class-validator';
import {Image} from './Image';
import {Optional} from '../util/decorators/optional';
import {BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table} from "sequelize-typescript";
import {ClientCredentialsRole} from "./client.credentials.role";
import {ServerCredentialsRole} from "./server.credentials.role";
import {Exclude} from "class-transformer";

@Table // todo note here need for both client and server credential roles models because using base wont work
export class BusinessDetails extends Model {

  @PrimaryKey
  @Column(DataType.STRING)
  id!: number;

  @Column(DataType.STRING(100))
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsUrl()
  @Optional()
  website?: string | null;

  @Optional()
  logo?: Image | null;

  @Exclude()
  @ForeignKey(() => ClientCredentialsRole)
  @Column(DataType.INTEGER)
  clientCredentialsRoleId!: number;

  @Exclude()
  @BelongsTo(() => ClientCredentialsRole)
  clientCredentialsRole!: ClientCredentialsRole;

  @Exclude()
  @ForeignKey(() => ServerCredentialsRole)
  @Column(DataType.INTEGER)
  serverCredentialsRoleId!: number;

  @Exclude()
  @BelongsTo(() => ServerCredentialsRole)
  serverCredentialsRole!: ServerCredentialsRole;

}
