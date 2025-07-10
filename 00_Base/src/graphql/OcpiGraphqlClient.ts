import { GraphQLClient } from 'graphql-request';

export class OcpiGraphqlClient {
  private client: GraphQLClient;

  constructor(endpoint: string, headers?: Record<string, string>) {
    this.client = new GraphQLClient(endpoint, { headers });
  }

  async request<T>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.client.request<T>(query, variables);
  }
}
