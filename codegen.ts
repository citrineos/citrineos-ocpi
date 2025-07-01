import 'dotenv/config';
import type { CodegenConfig } from '@graphql-codegen/cli'

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8090/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'CitrineOS!';

const config: CodegenConfig = {
  schema: {
    [HASURA_GRAPHQL_ENDPOINT]: {
      headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
    },
  },
  documents: ['00_Base/src/graphql/**/*.ts', '00_Base/src/graphql/**/*.tsx'],
  generates: {
    './00_Base/src/graphql/types/': {
      preset: 'client',
    }
  }
}
export default config