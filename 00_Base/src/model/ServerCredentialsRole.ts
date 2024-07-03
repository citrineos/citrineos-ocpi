import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasOne,
  Model,
  Table,
} from '@citrineos/data';
import { Role } from './Role';
import { ICredentialsRole } from './BaseCredentialsRole';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { CpoTenant } from './CpoTenant';
import { BusinessDetails } from './BusinessDetails';
import { Exclude } from 'class-transformer';
import { ON_DELETE_CASCADE } from '../util/sequelize';

export enum ServerCredentialsRoleProps {
  role = 'role',
  partyId = 'party_id',
  countryCode = 'country_code',
  businessDetails = 'business_details',
  cpoTenantId = 'cpoTenantId',
  cpoTenant = 'cpoTenant',
}

@Table
export class ServerCredentialsRole extends Model implements ICredentialsRole {
  @Column(DataType.ENUM(Role.CPO))
  [ServerCredentialsRoleProps.role] = Role.CPO;

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [ServerCredentialsRoleProps.partyId]!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [ServerCredentialsRoleProps.countryCode]!: string;

  @Exclude()
  @HasOne(() => BusinessDetails, {
    onDelete: ON_DELETE_CASCADE,
  })
  [ServerCredentialsRoleProps.businessDetails]!: BusinessDetails;

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  [ServerCredentialsRoleProps.cpoTenantId]!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  [ServerCredentialsRoleProps.cpoTenant]!: CpoTenant;

  static buildServerCredentialsRole(
    countryCode: string,
    partyId: string,
    businessDetails: BusinessDetails,
  ) {
    const serverCredentialsRole = new ServerCredentialsRole();
    serverCredentialsRole.country_code = countryCode;
    serverCredentialsRole.party_id = partyId;
    serverCredentialsRole.business_details = businessDetails;
    return serverCredentialsRole;
  }
}
