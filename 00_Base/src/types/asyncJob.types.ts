// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

// Temporary local definitions until @citrineos/data exports are fixed

export enum AsyncJobName {
  FETCH_OCPI_TOKENS = 'FETCH_OCPI_TOKENS',
}

export enum AsyncJobAction {
  RESUME = 'RESUME',
  STOP = 'STOP',
}

export interface AsyncJobPaginatedParams {
  offset?: number;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AsyncJobStatusDTO {
  jobId: string;
  jobName: AsyncJobName;
  tenantPartnerId: number;
  tenantPartner?: {
    id: number;
    name?: string;
    mspCountryCode?: string;
    mspPartyId?: string;
    cpoCountryCode?: string;
    cpoPartyId?: string;
  };
  createdAt: Date;
  finishedAt?: Date;
  stoppedAt?: Date | null;
  stopScheduled: boolean;
  isFailed?: boolean;
  paginatedParams: AsyncJobPaginatedParams;
  totalObjects?: number;
}

export interface AsyncJobRequest {
  tenantPartnerId: number;
  paginatedParams: AsyncJobPaginatedParams;
}
