# apollo-server-integration-testing-fastify

This package exports an utility function for writing apollo-server integration tests:

```js
import { createTestClient } from 'apollo-server-integration-testing-fastify';
```

## Usage

This function takes in an apollo server instance and returns a function that you can use to run operations against your schema, and assert on the results.

Example usage:

```js
import { createTestClient } from 'apollo-server-integration-testing-fastify';
import { createApolloServer } from './myServerCreationCode';

const apolloServer = await createApolloServer();
const { query, mutate } = createTestClient({
  apolloServer
});

const response = await query({
  query: `{ currentUser { id } }`
});

expect(response.statusCode).toEqual(200);

// You can access the response object using .json()
expect(response.json()).toEqual({
  data: {
    currentUser: {
      id: '1'
    }
  }
});

const UPDATE_USER = `
  mutation UpdateUser($id: ID!, $email: String!) {
    updateUser(id: $id, email: $email) {
      user {
        email
      }
    }
  }
`;

const mutationResponse = await mutate({
  mutation: UPDATE_USER,
  variables: { id: 1, email: 'nancy@foo.co' }
});

expect(mutationResponse.statusCode).toEqual(200);

// You can access the response object using .json()
expect(mutationResponse.json()).toEqual({
  data: {
    updateUser: {
      email: 'nancy@foo.co'
    }
  }
});
```

This allows you to test all the logic of your apollo server, including any logic inside of the `context` option that you can pass to the `ApolloServer` constructor.

### Mocking the `Request` object

`createTestClient` automatically mocks the `Request` object that will be passed to the `context` option of your `ApolloServer` constructor, so testing works out of the box.
You can also extend the mocked Request object with additional keys by passing a `requestOptions` parameter to `createTestClient`:

```js
const { query } = createTestClient({
  apolloServer,
  requestOptions: {
    headers: {
      cookie: 'csrf=blablabla',
      referer: ''
    }
  }
});
```

This is useful when your apollo server `context` option is a callback that operates on the passed in `req` key, and you want to inject data into that `req` object.

As mentioned above, if you don't pass a `requestOptions` object to `createTestClient`, we provide a default request mock object for you.

### setOptions

You can also set the `request` mocking option **after** the creation of the `test client`, which is a **cleaner** and **faster** way due not needing to create a new instance for **any** change you might want to do the `request`.

```js
const { query, setOptions } = await createTestClient({
  apolloServer
});

setOptions({
  // If "request" is not specified, it's not modified
  requestOptions: {
    headers: {
      cookie: 'csrf=blablabla',
      referer: ''
    }
  }
});
```

## Why not use `apollo-server-testing`?

You can't really write _real_ integration tests with `apollo-server-testing`, because it doesn't support servers which rely on the `context` option being a function that uses the `req` object ([see this issue for more information](https://github.com/apollographql/apollo-server/issues/2277)).

[Real apollo-servers support this behavior](https://www.apollographql.com/docs/apollo-server/essentials/data/#context-argument), but the test client created with `apollo-server-testing` does not. For example:

```js
import { createTestClient } from 'apollo-server-testing';

it('will not work', () => {
 const { query } = createTestClient(
   new ApolloServer({
     schema,
     context: ({ req }) => {
       return doSomethingWithReq(req); // this won't work because `req` is `undefined`.
     }
   })
 );

 // Any middleware or resolver code that depends on `context` will not work when this runs, because
 // the `context` function does *not* get passed `req` as expected.
 const result = await query({
   query: `{ currentUser { id } }`
 })
});
```

[The official integration example code from Apollo](https://github.com/apollographql/fullstack-tutorial/blob/6988f6948668ccc2dea3f7a216dd44bdf25a0b9f/final/server/src/__tests__/integration.js#L68-L74) solves this by instantiating an ApolloServer inside the test, mocking the `context` value by hand. But this is not a real integration testing, since you're skipping the whole HTTP framework handling.

## Support

This package should work for consumers using `apollo-server-fastify`.

## Release

To issue a new release run `pnpm release`.

## Acknowledgements

This project is inspired by <https://github.com/zapier/apollo-server-integration-testing>.
