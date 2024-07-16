import { Table, Model, DataType, Column } from 'sequelize-typescript';

/**
 * OCPI representation of an EVSE -- not named 'Evse' to avoid collisions
 * with Citrine's version of an EVSE.
 */
@Table
export class OcpiEvse extends Model {
  // this is a GENERAL id, i.e. 1 or 2
  // not the eMI3 id
  @Column({
    type: DataType.INTEGER,
    unique: 'evseId_stationId',
  })
  declare evseId: number;

  @Column({
    type: DataType.STRING,
    unique: 'evseId_stationId',
  })
  declare stationId: string;

  @Column(DataType.STRING)
  declare physicalReference?: string;

  @Column(DataType.BOOLEAN)
  declare removed?: boolean;

  @Column(DataType.DATE)
  declare lastUpdated: Date;

  static buildWithLastUpdated(
    evseId: number,
    stationId: string,
    lastUpdated: Date,
  ): OcpiEvse {
    const evse = new OcpiEvse();
    evse.evseId = evseId;
    evse.stationId = stationId;
    evse.lastUpdated = lastUpdated;
    return evse;
  }
}
