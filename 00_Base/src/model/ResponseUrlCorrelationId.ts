import { Column, DataType, Index, Model, Table } from 'sequelize-typescript';

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
}
