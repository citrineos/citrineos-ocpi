import { Table, Model, DataType, Column } from "sequelize-typescript";

/**
 * OCPI representation of an EVSE -- not named 'Evse' to avoid collisions
 * with Citrine's version of an EVSE.
 */
@Table
export class OcpiEvse extends Model<OcpiEvse> {
  // this is a GENERAL id, i.e. 1 or 2
  @Column({
    type: DataType.STRING,
    unique: 'id_stationId'
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    unique: 'id_stationId'
  })
  declare stationId: string;

  @Column(DataType.STRING)
  declare physicalReference?: string;

  @Column(DataType.DATE)
  declare lastUpdated: Date;
}
