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
};`,
          },
        },
        'typescript-operations',
      ],
      config: {
        // extractAllFieldsToTypes: true,
        // onlyOperationTypes: true,
        // preResolveTypes: true,
        skipTypename: true,
      },
    },
  },
};
export default config;
