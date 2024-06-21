import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * OCPI representation of a Location -- not named 'Location' to avoid collisions
 * with Citrine's version of a Location.
 */
@Table
export class OcpiLocation extends Model<OcpiLocation> {
  @Column(DataType.BOOLEAN)
  declare publish: boolean;

  @Column(DataType.DATE)
  declare lastUpdated: Date;
}
