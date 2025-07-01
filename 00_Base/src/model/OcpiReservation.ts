import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BelongsTo, Column, DataType, ForeignKey, Model, Reservation, Table } from '@citrineos/data';
import { CountryCode } from '../util/Util';
import { Enum } from '../util/decorators/Enum';
import { OcpiLocation } from './OcpiLocation';

export enum OcpiReservationProps {
  partyId = 'partyId',
  countryCode = 'countryCode',
  reservationId = 'reservationId',
  locationId = 'locationId',
  location = 'location',
  coreReservationId = 'coreReservationId',
  coreReservation = 'coreReservation',
  evseUid = 'evseUid',
  authorizationReference = 'authorizationReference',
}

@Table
export class OcpiReservation extends Model {
  @ForeignKey(() => Reservation)
  @Column({
    type: DataType.INTEGER,
    unique: true,
  })
  [OcpiReservationProps.coreReservationId]!: number;

  @BelongsTo(() => Reservation)
  declare [OcpiReservationProps.coreReservation]: Reservation;

  @ForeignKey(() => OcpiLocation)
  @Column(DataType.INTEGER)
  [OcpiReservationProps.locationId]!: number;

  @BelongsTo(() => OcpiLocation)
  declare [OcpiReservationProps.location]: OcpiLocation;

  @Column({
    type: DataType.STRING,
    unique: 'reservationId_countryCode_partyId',
  })
  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  [OcpiReservationProps.reservationId]!: string;

  @Column({
    type: DataType.ENUM(...Object.values(CountryCode)),
    unique: 'reservationId_countryCode_partyId',
  })
  @Enum(CountryCode, 'CountryCode')
  @IsNotEmpty()
  [OcpiReservationProps.countryCode]!: CountryCode;

  @Column({
    type: DataType.STRING,
    unique: 'reservationId_countryCode_partyId',
  })
  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  [OcpiReservationProps.partyId]!: string;

  @Column(DataType.STRING)
  @MaxLength(36)
  @IsString()
  [OcpiReservationProps.evseUid]?: string | null;

  @Column(DataType.STRING)
  @MaxLength(36)
  @IsString()
  [OcpiReservationProps.authorizationReference]?: string | null;
}
