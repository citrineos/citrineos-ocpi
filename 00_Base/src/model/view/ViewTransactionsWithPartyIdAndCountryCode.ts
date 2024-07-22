import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { SyncOptions } from 'sequelize';
import { Views } from '../../sql/views';
import { dropViewTransactionsWithPartyIdAndCountryCodeSql } from '../../sql/ViewTransactionsWithPartyIdAndCountryCode';

export enum ViewTransactionsWithPartyIdAndCountryCodeProps {
  partyId = 'party_id',
  countryCode = 'country_code',
  stationId = 'stationId',
  station = 'station',
  evse = 'evse',
  evseDatabaseId = 'evseDatabaseId',
  transactionId = 'transactionId',
  isActive = 'isActive',
  transactionEvents = 'transactionEvents',
  meterValues = 'meterValues',
  chargingState = 'chargingState',
  timeSpentCharging = 'timeSpentCharging',
  totalKwh = 'totalKwh',
  stoppedReason = 'stoppedReason',
  remoteStartId = 'remoteStartId',
  customData = 'customData',
}

@Table({
  modelName: Views.ViewTransactionsWithPartyIdAndCountryCodes,
  createdAt: false,
  updatedAt: false
})
export class ViewTransactionsWithPartyIdAndCountryCode extends Model {

  @Column({ primaryKey: true, autoIncrement: true })
  id!: number

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  [ViewTransactionsWithPartyIdAndCountryCodeProps.partyId]!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  [ViewTransactionsWithPartyIdAndCountryCodeProps.countryCode]!: string;

  // disables sync so that a new table is not created since we want to use the view.
  static async sync(options: SyncOptions): Promise<any> {
    if (options.force) {
      await this.sequelize?.query(dropViewTransactionsWithPartyIdAndCountryCodeSql)
    }
  }
}
