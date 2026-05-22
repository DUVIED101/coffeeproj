import type { NotificationId, UserId } from '../types/ids';

jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Import after jest.mock so the module under test gets the mocked supabase.
import { mapNotificationRow } from './NotificationFeedService';

const ROW_ID = 'notif-uuid-1';
const ROW_USER_ID = 'user-uuid-1';
const ROW_CONV_ID = 'conv-uuid-1';
const CREATED_AT_ISO = '2026-05-20T10:30:00.000Z';
const READ_AT_ISO = '2026-05-21T08:15:00.000Z';

describe('mapNotificationRow', () => {
  it('maps an unread new_message row with conversation data', () => {
    const result = mapNotificationRow({
      id: ROW_ID,
      user_id: ROW_USER_ID,
      kind: 'new_message',
      title: 'Coffee Shop',
      body: 'Hello!',
      data: { kind: 'new_message', conversationId: ROW_CONV_ID as never },
      read_at: null,
      created_at: CREATED_AT_ISO,
    });

    expect(result).toEqual({
      id: ROW_ID as NotificationId,
      userId: ROW_USER_ID as UserId,
      kind: 'new_message',
      title: 'Coffee Shop',
      body: 'Hello!',
      data: { kind: 'new_message', conversationId: ROW_CONV_ID },
      readAt: null,
      createdAt: new Date(CREATED_AT_ISO),
    });
  });

  it('maps a read row and parses read_at into a Date', () => {
    const result = mapNotificationRow({
      id: ROW_ID,
      user_id: ROW_USER_ID,
      kind: 'application_accepted',
      title: null,
      body: null,
      data: { kind: 'application_accepted' },
      read_at: READ_AT_ISO,
      created_at: CREATED_AT_ISO,
    });

    expect(result).toEqual({
      id: ROW_ID as NotificationId,
      userId: ROW_USER_ID as UserId,
      kind: 'application_accepted',
      title: null,
      body: null,
      data: { kind: 'application_accepted' },
      readAt: new Date(READ_AT_ISO),
      createdAt: new Date(CREATED_AT_ISO),
    });
  });

  it('falls back to { kind } when data column is null', () => {
    const result = mapNotificationRow({
      id: ROW_ID,
      user_id: ROW_USER_ID,
      kind: 'work_completion_confirmed',
      title: null,
      body: null,
      data: null,
      read_at: null,
      created_at: CREATED_AT_ISO,
    });

    expect(result.data).toEqual({ kind: 'work_completion_confirmed' });
  });
});
