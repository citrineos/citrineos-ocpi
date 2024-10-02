import {
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from '@citrineos/data';
import { v4 as uuidv4 } from 'uuid';
import { PaginatedParams } from '../controllers/param/paginated.params';

export enum AsyncJobName {
  FETCH_OCPI_TOKENS = 'FETCH_OCPI_TOKENS',
}

@Table
export class AsyncJobStatus extends Model {
  @PrimaryKey
  @Default(uuidv4) // Automatically generate jobId
  @Column(DataType.STRING)
  jobId!: string;

  @Column(DataType.ENUM(...Object.values(AsyncJobName)))
  jobName!: AsyncJobName;

  @Column(DataType.STRING)
  mspCountryCode!: string;

  @Column(DataType.STRING)
  mspPartyId!: string;

  @Column(DataType.STRING)
  cpoCountryCode!: string;

  @Column(DataType.STRING)
  cpoPartyId!: string;

  @Column(DataType.DATE)
  finishedAt?: Date;

  @Column(DataType.DATE)
  stoppedAt?: Date | null;

  @Column(DataType.BOOLEAN)
  stopScheduled!: boolean;

  @Column(DataType.BOOLEAN)
  isFailed!: boolean;

  @Column(DataType.JSON)
  paginationParams!: PaginatedParams;

  @Column(DataType.INTEGER) // Total number of objects in the client's system
  totalObjects?: number;

  toDTO(): AsyncJobStatusDTO {
    return {
      jobId: this.jobId,
      jobName: this.jobName,
      mspCountryCode: this.mspCountryCode,
      mspPartyId: this.mspPartyId,
      cpoCountryCode: this.cpoCountryCode,
      cpoPartyId: this.cpoPartyId,
      createdAt: this.createdAt,
      finishedAt: this.finishedAt,
      stoppedAt: this.stoppedAt,
      stopScheduled: this.stopScheduled,
      isFailed: this.isFailed,
      paginatedParams: this.paginationParams,
      totalObjects: this.totalObjects,
    };
  }
}

export class AsyncJobStatusDTO {
  jobId!: string;
  jobName!: AsyncJobName;
  mspCountryCode!: string;
  mspPartyId!: string;
  cpoCountryCode!: string;
  cpoPartyId!: string;
  createdAt!: Date;
  finishedAt?: Date;
  stoppedAt?: Date | null;
  stopScheduled!: boolean;
  isFailed?: boolean;
  paginatedParams!: PaginatedParams;
  totalObjects?: number;
}
