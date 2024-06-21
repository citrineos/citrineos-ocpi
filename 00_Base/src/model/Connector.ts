import { Table, Model, Column, DataType } from "sequelize-typescript";

/**
 * OCPI representation of a Connector -- not named 'Connector' to avoid collisions
 * with Citrine's version of a Connector.
 */
@Table
export class OcpiConnector extends Model<OcpiConnector> {
  @Column(DataType.DATE)
  declare lastUpdated: Date;
}
