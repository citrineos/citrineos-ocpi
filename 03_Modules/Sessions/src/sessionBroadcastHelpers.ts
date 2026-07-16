// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import type { TransactionDto } from '@zetra/citrineos-base';
import type {
  GetTransactionByTransactionIdQueryResult,
  GetTransactionByTransactionIdQueryVariables,
  OcpiGraphqlClient,
} from '@citrineos/ocpi-base';
import { GET_TRANSACTION_BY_TRANSACTION_ID_QUERY } from '@citrineos/ocpi-base';
import type { Logger } from 'tslog';
import type { ILogObj } from 'tslog';

export async function getTransactionForBroadcast(
  ocpiGraphqlClient: OcpiGraphqlClient,
  logger: Logger<ILogObj>,
  transactionId: string,
  context: string,
): Promise<TransactionDto | undefined> {
  const response = await ocpiGraphqlClient.request<
    GetTransactionByTransactionIdQueryResult,
    GetTransactionByTransactionIdQueryVariables
  >(GET_TRANSACTION_BY_TRANSACTION_ID_QUERY, { transactionId });

  const transaction = response.Transactions[0] as TransactionDto | undefined;
  if (!transaction) {
    logger.error(
      `Transaction not found for ID ${transactionId} (${context}), cannot broadcast.`,
    );
    return undefined;
  }
  return transaction;
}

export function getTokenOwnerPartnerId(
  transaction: TransactionDto,
): number | undefined {
  return transaction.authorization?.tenantPartner?.id ?? undefined;
}
