import {BelongsTo, Column, DataType, ForeignKey, HasOne, Model, Table,} from '@citrineos/data';
import {Role} from './Role';
import {ICredentialsRole} from './BaseCredentialsRole';
import {IsNotEmpty, IsString, Length} from 'class-validator';
import {ClientInformation} from './ClientInformation';
import {CpoTenant} from './CpoTenant';
import {BusinessDetails, fromBusinessDetailsDTO, toBusinessDetailsDTO,} from './BusinessDetails';
import {Exclude} from 'class-transformer';
import {ON_DELETE_CASCADE} from '../util/sequelize';
import {CredentialsRoleDTO} from './DTO/CredentialsRoleDTO';
import {Image} from './Image';

export enum ClientCredentialsRoleProps {
  role = 'role',
  partyId = 'party_id',
  countryCode = 'country_code',
  businessDetails = 'business_details',
  clientInformationId = 'clientInformationId',
  clientInformation = 'clientInformation',
  cpoTenantId = 'cpoTenantId',
  cpoTenant = 'cpoTenant',
}

@Table
export class ClientCredentialsRole extends Model implements ICredentialsRole {
  // todo seems like CredentialsRole base may be better fit as an interface
  @Column(DataType.ENUM(Role.EMSP))
  [ClientCredentialsRoleProps.role] = Role.EMSP;

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [ClientCredentialsRoleProps.partyId]!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [ClientCredentialsRoleProps.countryCode]!: string; // todo should we use CountryCode enum?

  @Exclude()
  @HasOne(() => BusinessDetails, {
    onDelete: ON_DELETE_CASCADE,
  })
  [ClientCredentialsRoleProps.businessDetails]!: BusinessDetails;

  @Exclude()
  @ForeignKey(() => ClientInformation)
  @Column(DataType.INTEGER)
  [ClientCredentialsRoleProps.clientInformationId]!: number;

  @Exclude()
  @BelongsTo(() => ClientInformation)
  [ClientCredentialsRoleProps.clientInformation]!: ClientInformation;

  @Exclude()
  @ForeignKey(() => CpoTenant)
  @Column(DataType.INTEGER)
  [ClientCredentialsRoleProps.cpoTenantId]!: number;

  @Exclude()
  @BelongsTo(() => CpoTenant)
  [ClientCredentialsRoleProps.cpoTenant]!: CpoTenant;

  static fromDto(credentialsRole: CredentialsRoleDTO) {
    return ClientCredentialsRole.build(
      {
        ...(credentialsRole as Partial<ClientCredentialsRole>),
      },
      {
        include: [
          {
            model: BusinessDetails,
            include: [Image],
          },
        ],
      },
    );
  }
}

export const toCredentialsRoleDTO = (
  clientCredentialsRole: ClientCredentialsRole,
): CredentialsRoleDTO => {
  const credentialsRoleDTO = new CredentialsRoleDTO();
  credentialsRoleDTO.role = clientCredentialsRole.role;
  credentialsRoleDTO.party_id = clientCredentialsRole.party_id;
  credentialsRoleDTO.country_code = clientCredentialsRole.country_code;
  if (clientCredentialsRole.business_details) {
    credentialsRoleDTO.business_details = toBusinessDetailsDTO(
      clientCredentialsRole.business_details,
    );
  }
  return credentialsRoleDTO;
};

export const fromCredentialsRoleDTO = (role: CredentialsRoleDTO): any => {
  const record: any = {
    role: role.role,
    party_id: role.party_id,
    country_code: role.country_code,
  };
  const clientCredentialsRole = ClientCredentialsRole.build(record, {
    include: [BusinessDetails],
  });
  if (role.business_details) {
    clientCredentialsRole.setDataValue(
      'business_details',
      fromBusinessDetailsDTO(role.business_details),
    );
  }
  return clientCredentialsRole;
};
