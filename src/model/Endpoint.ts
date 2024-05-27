import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';
import { Enum } from '../util/decorators/enum';
import {Column, DataType, Model, Table, ForeignKey} from 'sequelize-typescript';
import {OcpiNamespace} from "../util/ocpi.namespace";
import {Version} from "./Version";

@Table
export class Endpoint extends Model{

  static readonly MODEL_NAME: string = OcpiNamespace.Endpoint;

  @Column(DataType.STRING)
  @ForeignKey(() => Version)
  version!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsNotEmpty()
  identifier!: ModuleId;

  @Column(DataType.STRING)
  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;


  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url!: string;
}
