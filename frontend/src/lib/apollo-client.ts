'use client';

import { ApolloClient, from, HttpLink, InMemoryCache } from '@apollo/client';
import { FetchPolicy } from '@apollo/client/core/watchQueryOptions';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

// Create the http link
const httpLink = new HttpLink({
  uri: apiUrl,
  credentials: 'include',
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    console.error('Operation:', operation);
    console.error('Request:', operation.getContext());
  }
});

// Retry link with strict conditions
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      // Only retry on network errors
      return !!error && 'networkError' in error;
    }
  }
});

export const client = new ApolloClient({
  link: from([errorLink, retryLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getMetrics: {
            merge: false, // Don't merge results, always use the latest
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network' as FetchPolicy,
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'cache-and-network' as FetchPolicy,
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: true,
}); 