/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetLocations($limit: Int, $offset: Int, $countryCode: String, $partyId: String, $dateFrom: String, $dateTo: String) {\n    Locations(\n      offset: $offset\n      limit: $limit\n    ) {\n      id\n      name\n      address\n      city\n      postalCode\n      state\n      country\n      coordinates\n      createdAt\n      updatedAt\n      ChargingStations {\n        id\n        isOnline\n        protocol\n        createdAt\n        updatedAt\n        Evses: VariableAttributes(\n          distinct_on: evseDatabaseId\n          where: {\n            evseDatabaseId: { _is_null: false }\n            Evse: { connectorId: { _is_null: false } }\n          }\n        ) {\n          Evse {\n            databaseId\n            id\n            connectorId\n            createdAt\n            updatedAt\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetLocationsDocument,
};
const documents: Documents = {
    "\n  query GetLocations($limit: Int, $offset: Int, $countryCode: String, $partyId: String, $dateFrom: String, $dateTo: String) {\n    Locations(\n      offset: $offset\n      limit: $limit\n    ) {\n      id\n      name\n      address\n      city\n      postalCode\n      state\n      country\n      coordinates\n      createdAt\n      updatedAt\n      ChargingStations {\n        id\n        isOnline\n        protocol\n        createdAt\n        updatedAt\n        Evses: VariableAttributes(\n          distinct_on: evseDatabaseId\n          where: {\n            evseDatabaseId: { _is_null: false }\n            Evse: { connectorId: { _is_null: false } }\n          }\n        ) {\n          Evse {\n            databaseId\n            id\n            connectorId\n            createdAt\n            updatedAt\n          }\n        }\n      }\n    }\n  }\n": types.GetLocationsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetLocations($limit: Int, $offset: Int, $countryCode: String, $partyId: String, $dateFrom: String, $dateTo: String) {\n    Locations(\n      offset: $offset\n      limit: $limit\n    ) {\n      id\n      name\n      address\n      city\n      postalCode\n      state\n      country\n      coordinates\n      createdAt\n      updatedAt\n      ChargingStations {\n        id\n        isOnline\n        protocol\n        createdAt\n        updatedAt\n        Evses: VariableAttributes(\n          distinct_on: evseDatabaseId\n          where: {\n            evseDatabaseId: { _is_null: false }\n            Evse: { connectorId: { _is_null: false } }\n          }\n        ) {\n          Evse {\n            databaseId\n            id\n            connectorId\n            createdAt\n            updatedAt\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetLocations($limit: Int, $offset: Int, $countryCode: String, $partyId: String, $dateFrom: String, $dateTo: String) {\n    Locations(\n      offset: $offset\n      limit: $limit\n    ) {\n      id\n      name\n      address\n      city\n      postalCode\n      state\n      country\n      coordinates\n      createdAt\n      updatedAt\n      ChargingStations {\n        id\n        isOnline\n        protocol\n        createdAt\n        updatedAt\n        Evses: VariableAttributes(\n          distinct_on: evseDatabaseId\n          where: {\n            evseDatabaseId: { _is_null: false }\n            Evse: { connectorId: { _is_null: false } }\n          }\n        ) {\n          Evse {\n            databaseId\n            id\n            connectorId\n            createdAt\n            updatedAt\n          }\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;