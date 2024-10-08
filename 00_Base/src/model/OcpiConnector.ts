import { Column, DataType, Model, Table } from '@citrineos/data';

/**
 * OCPI representation of a Connector -- not named 'Connector' to avoid collisions
 * with Citrine's version of a Connector.
 */
@Table
export class OcpiConnector extends Model {
  // this is a GENERAL id, i.e. 1 or 2
  @Column({
    type: DataType.INTEGER,
    unique: 'connectorId_evseId_stationId',
  })
  declare connectorId: number;

  @Column({
    type: DataType.INTEGER,
    unique: 'connectorId_evseId_stationId',
  })
  declare evseId: number;

  @Column({
    type: DataType.STRING,
    unique: 'connectorId_evseId_stationId',
  })
  declare stationId: string;

  @Column(DataType.DATE)
  declare lastUpdated: Date;

  static buildWithLastUpdated(
    connectorId: number,
    evseId: number,
    stationId: string,
    lastUpdated: Date,
  ): OcpiConnector {
    const connector = new OcpiConnector();
    connector.connectorId = connectorId;
    connector.evseId = evseId;
    connector.stationId = stationId;
    connector.lastUpdated = lastUpdated;
    return connector;
  }
}
