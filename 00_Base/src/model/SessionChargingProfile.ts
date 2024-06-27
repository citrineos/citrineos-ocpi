import { Column, DataType, Index, Model, Table } from 'sequelize-typescript';

@Table
export class SessionChargingProfile extends Model {
  @Index
  @Column({
    type: DataType.STRING,
    unique: true,
  })
  sessionId!: string;

  @Column(DataType.INTEGER)
  chargingProfileId!: number;

  @Column(DataType.INTEGER)
  chargingScheduleId!: number;
}
