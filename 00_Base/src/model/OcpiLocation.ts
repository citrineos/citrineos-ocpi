import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { OcpiEvse } from './OcpiEvse';

export enum OcpiLocationProps {
  coreLocationId = 'coreLocationId',
  publish = 'publish',
  lastUpdated = 'lastUpdated',
  partyId = 'partyId',
  countryCode = 'countryCode',
  timeZone = 'timeZone',
}

/**
 * OCPI representation of a Location -- not named 'Location' to avoid collisions
 * with Citrine's version of a Location.
 *
 * Note that "coreLocationId" in OcpiLocation should match Citrine Core's Location id.
 *
 * TODO add link to credentials for the correct tenant
 */
@Table
export class OcpiLocation extends Model {
  @Column({
    type: DataType.INTEGER,
    unique: true,
  })
  [OcpiLocationProps.coreLocationId]!: number;

  @Column(DataType.BOOLEAN)
  [OcpiLocationProps.publish]!: boolean;

  @Column(DataType.DATE)
  [OcpiLocationProps.lastUpdated]!: Date;

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

  @Column(DataType.STRING)
  [OcpiLocationProps.timeZone]!: string;

  /* Helper properties */
  ocpiEvses!: Record<string, OcpiEvse>;

  static buildWithLastUpdated(
    coreLocationId: number,
    lastUpdated: Date,
  ): OcpiLocation {
    const location = new OcpiLocation();
    location.coreLocationId = coreLocationId;
    location.lastUpdated = lastUpdated;
    return location;
  }
}
