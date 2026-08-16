import type { ApplicationId, ReviewId, UserId } from '../types/ids';
import type { CreateReviewData, RaterRole, StarRating } from '../types/review';

type ReviewRow = {
  id: string;
  application_id: string;
  rater_role: RaterRole;
  ratee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type AggregateRow = {
  user_id: string;
  average_rating: number;
  review_count: number;
};

type SelectedColumns = string;

type InsertBuilderMock = {
  insert: jest.Mock;
  select: jest.Mock<unknown, [SelectedColumns]>;
  single: jest.Mock<Promise<{ data: ReviewRow | null; error: { code?: string } | null }>, []>;
  __captureInsert: { payload: Record<string, unknown> | null };
};

type SelectBuilderMock<TRow> = {
  select: jest.Mock<unknown, [SelectedColumns]>;
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  maybeSingle: jest.Mock<Promise<{ data: TRow | null; error: null }>, []>;
  then: jest.Mock;
  resolveListWith: (rows: TRow[]) => void;
  __selectedColumns: { value: SelectedColumns | null };
};

const RATER_ROLE_BARISTA: RaterRole = 'barista';
const RATER_ROLE_BUSINESS: RaterRole = 'business';
const RATING_FOUR: StarRating = 4;
const RATING_FIVE: StarRating = 5;
const COMMENT_TEXT = 'Excellent shift, would hire again';

const APPLICATION_ID = 'application-uuid-1' as ApplicationId;
const RATEE_USER_ID = 'ratee-user-uuid-1' as UserId;
const OTHER_USER_ID = 'ratee-user-uuid-2' as UserId;
const AUTH_USER_ID = 'auth-user-uuid-1';
const REVIEW_ID = 'review-uuid-1' as ReviewId;
const CREATED_AT = '2026-04-30T12:00:00.000Z';

const REVIEW_ROW_NO_COMMENT: ReviewRow = {
  id: REVIEW_ID,
  application_id: APPLICATION_ID,
  rater_role: RATER_ROLE_BARISTA,
  ratee_id: RATEE_USER_ID,
  rating: RATING_FOUR,
  comment: null,
  created_at: CREATED_AT,
};

const REVIEW_ROW_WITH_COMMENT: ReviewRow = {
  ...REVIEW_ROW_NO_COMMENT,
  rating: RATING_FIVE,
  comment: COMMENT_TEXT,
};

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Import after jest.mock so the service receives the mocked supabase client.
import { ReviewService } from './ReviewService';

const createInsertBuilderMock = (
  result:
    | { data: ReviewRow; error: null }
    | { data: null; error: { code?: string; message?: string } | null }
): InsertBuilderMock => {
  const captured = { payload: null as Record<string, unknown> | null };
  const builder: Partial<InsertBuilderMock> = {
    __captureInsert: captured,
  };
  builder.insert = jest.fn((payload: Record<string, unknown>) => {
    captured.payload = payload;
    return builder as InsertBuilderMock;
  });
  builder.select = jest.fn(() => builder as InsertBuilderMock);
  builder.single = jest.fn(() => Promise.resolve(result));
  return builder as InsertBuilderMock;
};

const createSelectBuilderMock = <TRow>(
  initialRows: TRow[],
  initialMaybe: TRow | null = null
): SelectBuilderMock<TRow> => {
  const captured = { value: null as SelectedColumns | null };
  let rows = [...initialRows];
  let maybe = initialMaybe;
  const builder: Partial<SelectBuilderMock<TRow>> = {
    __selectedColumns: captured,
  };
  builder.select = jest.fn((cols: SelectedColumns) => {
    captured.value = cols;
    return builder as SelectBuilderMock<TRow>;
  });
  builder.eq = jest.fn(() => builder as SelectBuilderMock<TRow>);
  builder.in = jest.fn(() => builder as SelectBuilderMock<TRow>);
  builder.order = jest.fn(() => Promise.resolve({ data: rows, error: null }));
  builder.maybeSingle = jest.fn(() => Promise.resolve({ data: maybe, error: null }));
  builder.then = jest.fn((onFulfilled: (value: { data: TRow[]; error: null }) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(onFulfilled)
  );
  builder.resolveListWith = (newRows: TRow[]) => {
    rows = newRows;
    maybe = null;
  };
  return builder as SelectBuilderMock<TRow>;
};

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null });
});

describe('createReview', () => {
  it('inserts a rating-only review and returns the mapped row', async () => {
    const builder = createInsertBuilderMock({ data: REVIEW_ROW_NO_COMMENT, error: null });
    mockFrom.mockReturnValue(builder);

    const data: CreateReviewData = {
      applicationId: APPLICATION_ID,
      raterRole: RATER_ROLE_BARISTA,
      rateeId: RATEE_USER_ID,
      rating: RATING_FOUR,
    };

    const result = await ReviewService.createReview(data);

    expect(mockFrom).toHaveBeenCalledWith('application_reviews');
    expect(builder.insert).toHaveBeenCalledWith({
      application_id: APPLICATION_ID,
      rater_role: RATER_ROLE_BARISTA,
      rater_id: AUTH_USER_ID,
      ratee_id: RATEE_USER_ID,
      rating: RATING_FOUR,
      comment: null,
    });
    expect(result).toEqual({
      id: REVIEW_ID,
      applicationId: APPLICATION_ID,
      raterRole: RATER_ROLE_BARISTA,
      rateeId: RATEE_USER_ID,
      rating: RATING_FOUR,
      comment: undefined,
      createdAt: CREATED_AT,
    });
  });

  it('inserts a rating+comment review and returns the comment in the mapped row', async () => {
    const builder = createInsertBuilderMock({ data: REVIEW_ROW_WITH_COMMENT, error: null });
    mockFrom.mockReturnValue(builder);

    const data: CreateReviewData = {
      applicationId: APPLICATION_ID,
      raterRole: RATER_ROLE_BUSINESS,
      rateeId: RATEE_USER_ID,
      rating: RATING_FIVE,
      comment: COMMENT_TEXT,
    };

    const result = await ReviewService.createReview(data);

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rater_role: RATER_ROLE_BUSINESS, comment: COMMENT_TEXT })
    );
    expect(result.comment).toBe(COMMENT_TEXT);
  });

  it('rejects duplicate inserts with a friendly error', async () => {
    const builder = createInsertBuilderMock({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    mockFrom.mockReturnValue(builder);

    await expect(
      ReviewService.createReview({
        applicationId: APPLICATION_ID,
        raterRole: RATER_ROLE_BARISTA,
        rateeId: RATEE_USER_ID,
        rating: RATING_FIVE,
      })
    ).rejects.toThrow('Review already submitted for this application');
  });

  it('selects only the public review columns and never includes rater_id', async () => {
    const builder = createInsertBuilderMock({ data: REVIEW_ROW_NO_COMMENT, error: null });
    mockFrom.mockReturnValue(builder);

    await ReviewService.createReview({
      applicationId: APPLICATION_ID,
      raterRole: RATER_ROLE_BARISTA,
      rateeId: RATEE_USER_ID,
      rating: RATING_FOUR,
    });

    const selectedColumns = (builder.select as jest.Mock).mock.calls[0][0] as string;
    expect(selectedColumns).not.toContain('rater_id');
    expect(selectedColumns.split(',').map(s => s.trim())).toEqual([
      'id',
      'application_id',
      'rater_role',
      'ratee_id',
      'rating',
      'comment',
      'created_at',
    ]);
  });
});

describe('getAggregateForUser', () => {
  it('returns zeroed aggregate when the user has no reviews', async () => {
    const builder = createSelectBuilderMock<AggregateRow>([], null);
    mockFrom.mockReturnValue(builder);

    const aggregate = await ReviewService.getAggregateForUser(RATEE_USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('user_review_aggregates');
    expect(aggregate).toEqual({
      userId: RATEE_USER_ID,
      averageRating: 0,
      reviewCount: 0,
    });
  });

  it('returns mapped aggregate when the user has reviews', async () => {
    const aggregateRow: AggregateRow = {
      user_id: RATEE_USER_ID,
      average_rating: 4.6,
      review_count: 12,
    };
    const builder = createSelectBuilderMock<AggregateRow>([], aggregateRow);
    mockFrom.mockReturnValue(builder);

    const aggregate = await ReviewService.getAggregateForUser(RATEE_USER_ID);

    expect(aggregate).toEqual({
      userId: RATEE_USER_ID,
      averageRating: 4.6,
      reviewCount: 12,
    });
  });
});

describe('getAggregatesForUsers', () => {
  it('returns an empty map without calling Supabase when given no ids', async () => {
    const result = await ReviewService.getAggregatesForUsers([]);

    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('issues a single query and zero-fills missing users', async () => {
    const aggregateRows: AggregateRow[] = [
      { user_id: RATEE_USER_ID, average_rating: 4.0, review_count: 5 },
    ];
    const builder = createSelectBuilderMock<AggregateRow>(aggregateRows);
    mockFrom.mockReturnValue(builder);

    const result = await ReviewService.getAggregatesForUsers([RATEE_USER_ID, OTHER_USER_ID]);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(builder.in).toHaveBeenCalledWith('user_id', [RATEE_USER_ID, OTHER_USER_ID]);
    expect(result.get(RATEE_USER_ID)).toEqual({
      userId: RATEE_USER_ID,
      averageRating: 4.0,
      reviewCount: 5,
    });
    expect(result.get(OTHER_USER_ID)).toEqual({
      userId: OTHER_USER_ID,
      averageRating: 0,
      reviewCount: 0,
    });
  });
});

describe('review service select payload', () => {
  it('never selects rater_id when reading reviews for a user', async () => {
    const builder = createSelectBuilderMock<ReviewRow>([REVIEW_ROW_WITH_COMMENT]);
    mockFrom.mockReturnValue(builder);

    await ReviewService.getReviewsForUser(RATEE_USER_ID);

    const selectedColumns = (builder.select as jest.Mock).mock.calls[0][0] as string;
    expect(selectedColumns).not.toContain('rater_id');
  });
});
