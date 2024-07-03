import { Column, DataType, Model, Table, ForeignKey } from 'sequelize-typescript';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Location } from '@citrineos/data';

export enum OcpiLocationProps {
  citrineLocationId = 'citrineLocationId',
  publish = 'publish',
  lastUpdated = 'lastUpdated',
  partyId = 'party_id',
  countryCode = 'country_code',
}

/**
 * OCPI representation of a Location -- not named 'Location' to avoid collisions
 * with Citrine's version of a Location.
 *
 * Note that the id of OcpiLocation should match Citrine's Location.
 *
 * TODO add link to credentials for the correct tenant
 */
@Table
export class OcpiLocation extends Model {

  @Column({
    type: DataType.INTEGER,
    unique: true
  })
  @ForeignKey(() => Location)
  [OcpiLocationProps.citrineLocationId]!: number;

  @Column(DataType.BOOLEAN)
  [OcpiLocationProps.publish]?: boolean;

  @Column(DataType.DATE)
  [OcpiLocationProps.lastUpdated]?: Date;

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [OcpiLocationProps.partyId]!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [OcpiLocationProps.countryCode]!: string; // todo should we use CountryCode enum?

  static buildWithLastUpdated(
    citrineLocationId: number,
    lastUpdated: Date
  ): OcpiLocation {
    const location = new OcpiLocation();
    location.citrineLocationId = citrineLocationId;
    location.lastUpdated = lastUpdated;
    return location;
  }
}
