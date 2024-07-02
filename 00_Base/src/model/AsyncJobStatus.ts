import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { PaginatedParams } from '../controllers/param/paginated.params';

export enum AsyncJobName {
  FETCH_OCPI_TOKENS = 'fetch OCPI tokens',
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

  @Column(DataType.STRING)
  countryCode!: string;

  @Column(DataType.STRING)
  partyId!: string;

  @Column(DataType.DATE) // Start Time is automatically set with the created at field
  stopTime?: Date;

  @Column(DataType.INTEGER) // Updated after first request is done and the response shows the pagination information
  totalObjects?: number;

  @Column(DataType.INTEGER) // Use to keep track of how far we are
  currentOffset?: number;

  @Column(DataType.JSON)
  paginatedParams?: PaginatedParams;

  @Column(DataType.STRING)
  failureMessage?: string; // Used to keep track of the errors. If this is set, it means something went wrong

  toDTO(): AsyncJobStatusDTO {
    return {
      jobId: this.jobId,
      createdAt: this.createdAt,
      isFinished: this.isFinished,
      stopTime: this.stopTime,
      totalObjects: this.totalObjects,
      currentOffset: this.currentOffset,
      paginatedParams: this.paginatedParams,
      countryCode: this.countryCode,
      partyId: this.partyId,
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
  countryCode!: string;
  partyId!: string;
}
