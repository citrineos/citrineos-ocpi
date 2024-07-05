import {
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from '@citrineos/data';
import { CreationOptional } from 'sequelize';
import { DisplayText } from './DisplayText';

@Table
export class OcpiTariff extends Model {
  @PrimaryKey
  @Column(DataType.STRING(36))
  declare id: string;

  @PrimaryKey
  @Column(DataType.CHAR(2))
  declare countryCode: string;

  @PrimaryKey
  @Column(DataType.STRING(3))
  declare partyId: string;

  @Index
  @Column({
    type: DataType.INTEGER,
    unique: true,
  })
  declare coreTariffId: number;

  @Column(DataType.JSON)
  declare tariffAltText?: DisplayText[];

  declare updatedAt: CreationOptional<Date>;

  get key(): TariffKey {
    return {
      id: this.id,
      countryCode: this.countryCode,
      partyId: this.partyId,
    };
  }
}

export interface TariffKey {
  id: string;
  countryCode: string;
  partyId: string;
}
