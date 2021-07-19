import { ApolloServer } from 'apollo-server-fastify';
import fastify, { LightMyRequestResponse, InjectOptions } from 'fastify';
import { DocumentNode, print } from 'graphql';

export type StringOrAst = string | DocumentNode;

export type TestClientConfig = {
  // The ApolloServer instance that will be used for handling the queries you run in your tests.
  // Must be an instance of the ApolloServer class from `apollo-server-fastify` (or a compatible subclass).
  apolloServer: ApolloServer;
  // Extends the mocked Request object with additional data.
  // Useful when your apolloServer `context` option is a callback that operates on the passed in `req` key,
  // and you want to inject data into that `req` object.
  requestOptions?: InjectOptions;
};

export type SetOptionsFn = (options: {
  requestOptions?: InjectOptions;
}) => void;

type Query = {
  query: StringOrAst;
  mutation?: undefined;
  variables?: {
    [name: string]: any;
  };
  operationName?: string;
};
type Mutation = {
  mutation: StringOrAst;
  query?: undefined;
  variables?: {
    [name: string]: any;
  };
  operationName?: string;
};

export interface ApolloServerTestClient {
  query: (query: Query) => Promise<LightMyRequestResponse>;
  mutate: (mutation: Mutation) => Promise<LightMyRequestResponse>;
  setOptions: SetOptionsFn,
}

/**
 * This function takes in an apollo server instance and returns a function that you can use to run operations
 * against your schema, and assert on the results.
 * @example
 * const apolloServer = await createApolloServer({ schema })
 * const query = createTestClient({
 *  apolloServer,
 * });
 * @param {TestClientConfig} options
 * @returns {ApolloServerTestClient}
 */
export async function createTestClient({
  apolloServer,
  requestOptions = {},
}: TestClientConfig): Promise<ApolloServerTestClient> {
  const app = fastify();
  await apolloServer.start();
  app.register(apolloServer.createHandler());

  let mockRequestOptions = requestOptions;

  /**
   * Set the options after TestClient creation
   * Useful when you don't want to create a new instance just for a specific change in the request.
   */
  const setOptions: SetOptionsFn = ({
    requestOptions,
  }) => {
    if (requestOptions) {
      mockRequestOptions = requestOptions;
    }
  };

  /**
   * Run an operation against the server
   * @example
   * const result = await query({
   *   query: `{ currentUser { id } }`
   * })
   *
   * expect(result.json()).toEqual({
   *   data: {
   *     currentUser: {
   *       id: '1'
   *     }
   *   }
   * });
   * @param {Query | Mutation} params
   * @returns {fastify.HTTPInjectResponse} fastify response
   */
  const test = ({ query, mutation, ...args }: Query | Mutation): Promise<LightMyRequestResponse> => {
    const operation = query || mutation;

    if (!operation || (query && mutation)) {
      throw new Error(
        'Either `query` or `mutation` must be passed, but not both.',
      );
    }

    const opts: InjectOptions = {
      url: apolloServer.graphqlPath,
      method: 'POST',
      payload: {
        query: typeof operation === 'string' ? operation : print(operation),
        ...args,
      },
      ...mockRequestOptions,
    };

    return app.inject(opts);
  };

  return {
    query: test,
    mutate: test,
    setOptions
  };
}
