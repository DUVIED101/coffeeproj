import { QueryClient } from '@tanstack/react-query';

// staleTime keeps the data fresh long enough to skip an immediate refetch when
// the user bounces between tabs, but short enough that the next focus refresh
// still picks up server-side changes (e.g. a new application landing while
// the JobFeed is open). gcTime holds the cache long enough to survive
// background -> foreground transitions on iOS without re-fetching from cold.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  jobs: {
    all: ['jobs'] as const,
    search: (filters: unknown, location: unknown) =>
      [...queryKeys.jobs.all, 'search', filters, location] as const,
    byOwner: (ownerId: string, activeOnly: boolean) =>
      [...queryKeys.jobs.all, 'byOwner', ownerId, activeOnly] as const,
  },
  applications: {
    all: ['applications'] as const,
    byBarista: (baristaId: string) =>
      [...queryKeys.applications.all, 'byBarista', baristaId] as const,
    appliedJobIds: (baristaId: string) =>
      [...queryKeys.applications.all, 'appliedJobIds', baristaId] as const,
  },
  baristaProfile: {
    byUserId: (userId: string) => ['baristaProfile', userId] as const,
  },
  reviews: {
    aggregatesForUsers: (userIds: ReadonlyArray<string>) =>
      ['reviews', 'aggregates', [...userIds].sort()] as const,
  },
  conversations: {
    forUser: (userId: string, accountType: string) =>
      ['conversations', userId, accountType] as const,
  },
} as const;
