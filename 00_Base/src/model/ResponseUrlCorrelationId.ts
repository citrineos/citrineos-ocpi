import { Column, DataType, Index, Model, Table } from '@citrineos/data';
import { OcpiParams } from '../trigger/util/OcpiParams';

@Table
export class ResponseUrlCorrelationId extends Model {
  @Index
  @Column({
    type: DataType.STRING,
    unique: true,
  })
  correlationId!: string;

  @Column(DataType.STRING)
  responseUrl!: string;

  @Column(DataType.JSON)
  params?: OcpiParams;
}
