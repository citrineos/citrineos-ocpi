// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import 'dotenv/config';
import type { CodegenConfig } from '@graphql-codegen/cli';

const HASURA_GRAPHQL_ENDPOINT =
  process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8090/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'CitrineOS!';

const config: CodegenConfig = {
  schema: {
    [HASURA_GRAPHQL_ENDPOINT]: {
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
    },
  },
  documents: ['./00_Base/src/graphql/queries/*.ts'],
  generates: {
    './00_Base/src/graphql/operations.ts': {
      plugins: [
        {
          add: {
            content: `export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bigint: { input: any; output: any; }
  bpchar: { input: any; output: any; }
  enum_InstalledCertificates_certificateType: { input: any; output: any; }
  geography: { input: any; output: any; }
  geometry: { input: any; output: any; }
  json: { input: any; output: any; }
  jsonb: { input: any; output: any; }
  numeric: { input: any; output: any; }
  timestamptz: { input: any; output: any; }
};
export type Authorizations_Set_Input = {
  additionalInfo?: InputMaybe<Scalars['jsonb']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  language1?: InputMaybe<Scalars['String']['input']>;
  groupAuthorizationId?: InputMaybe<Scalars['Int']['input']>;
  realTimeAuth?: InputMaybe<Scalars['String']['input']>;
  updatedAt: Scalars['timestamptz']['input'];
};
export type Locations_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Tariffs_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Transactions_Bool_Exp = {
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  Authorization?: InputMaybe<Authorizations_Bool_Exp>;
  Tenant?: InputMaybe<Tenants_Bool_Exp>;
};
export type Authorizations_Bool_Exp = {
  TenantPartner?: InputMaybe<TenantPartners_Bool_Exp>;
};
export type Timestamptz_Comparison_Exp = {
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
};
export type Tenants_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
};
export type TenantPartners_Bool_Exp = {
  countryCode?: InputMaybe<String_Comparison_Exp>;
  partyId?: InputMaybe<String_Comparison_Exp>;
};
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
};`,
          },
        },
        'typescript-operations',
      ],
      config: {
        skipTypename: true,
        operationResultSuffix: 'Result',
        printFieldsOnNewLines: true,
        // extractAllFieldsToTypes: true,
        // inlineFragmentTypes: 'combine'
        // mergeFragmentTypes: true,
        // flattenGeneratedTypes: true,
        // flattenGeneratedTypesIncludeFragments: true,
      },
    },
  },
};
export default config;
