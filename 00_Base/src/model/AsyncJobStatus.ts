import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { PaginatedParams } from '../controllers/param/paginated.params';

export enum AsyncJobName {
  FETCH_OCPI_TOKENS = 'fetch OCPI tokens'
}

@Table
export class AsyncJobStatus extends Model {
  @PrimaryKey
  @Default(uuidv4) // Automatically generate jobId
  @Column(DataType.STRING)
  jobId!: string;

  @Column(DataType.ENUM(...Object.values(AsyncJobName)))
  jobName!: AsyncJobName;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isFinished!: boolean;

  @Column(DataType.DATE) //Start Time is automatically set with the created at field
  stopTime?: Date;

  @Column(DataType.INTEGER) //Updated after first request is done and the response shows the pagination information
  totalObjects?: number;

  @Column(DataType.INTEGER) //Use to keep track of how far we are
  currentOffset?: number;

  @Column(DataType.INTEGER) //Used to keep track how bi the steps are and how fast we are going
  currentLimit?: number;

  @Column(DataType.JSON)
  paginatedParams?: PaginatedParams;


  toDTO(): AsyncJobStatusDTO {
    return {
      jobId: this.jobId,
      createdAt: this.createdAt,
      isFinished: this.isFinished,
      stopTime: this.stopTime,
      totalObjects: this.totalObjects,
      currentOffset: this.currentOffset,
      currentLimit: this.currentLimit,
      paginatedParams: this.paginatedParams,
    };
  }
}

export class AsyncJobStatusDTO {
  jobId!: string;
  createdAt!: Date;
  isFinished!: boolean;
  stopTime?: Date;
  totalObjects?: number;
  currentOffset?: number;
  currentLimit?: number;
  paginatedParams?: PaginatedParams;
}
