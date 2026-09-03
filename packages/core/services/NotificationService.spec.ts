import type { UserId } from '../types/ids';
import type { DeviceToken } from '../types/notification';
import type { PushSubscription } from '../platform/push';

const USER_ID = 'user-uuid-1' as UserId;
const WEB_ENDPOINT = 'https://push.example.com/send/abc123' as DeviceToken;
const APNS_TOKEN = 'a1b2c3d4e5f6' as DeviceToken;
const P256DH =
  'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const AUTH = 'BTBZMqHH6r4Tts7J_aSIgg';

const mockFrom = jest.fn();
const mockSubscribe = jest.fn<Promise<PushSubscription>, [AbortSignal | undefined]>();
const mockUnsubscribe = jest.fn<Promise<void>, []>();

jest.mock('../config/supabase', () => ({
  getSupabase: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

jest.mock('../platform', () => ({
  getPlatform: () => ({
    push: {
      subscribe: (signal?: AbortSignal) => mockSubscribe(signal),
      unsubscribe: () => mockUnsubscribe(),
    },
  }),
}));

// Import after jest.mock so the service receives the mocked modules.
import { NotificationService } from './NotificationService';

type TableCapture = {
  tables: string[];
  upsertRow: Record<string, unknown> | null;
  upsertOptions: unknown;
  deleteEqCalls: Array<[string, unknown]>;
};

const newCapture = (): TableCapture => ({
  tables: [],
  upsertRow: null,
  upsertOptions: null,
  deleteEqCalls: [],
});

// One fake table builder serving both writes the service performs (upsert on
// register, delete().eq().eq() on unregister).
const useTableMock = (capture: TableCapture): void => {
  mockFrom.mockImplementation((table: string) => {
    capture.tables.push(table);
    const builder = {
      upsert: jest.fn((row: Record<string, unknown>, options: unknown) => {
        capture.upsertRow = row;
        capture.upsertOptions = options;
        return Promise.resolve({ error: null });
      }),
      delete: jest.fn(() => builder),
      eq: jest.fn((column: string, value: unknown) => {
        capture.deleteEqCalls.push([column, value]);
        return capture.deleteEqCalls.length % 2 === 0 ? Promise.resolve({ error: null }) : builder;
      }),
    };
    return builder;
  });
};

beforeEach(() => {
  mockFrom.mockReset();
  mockSubscribe.mockReset();
  mockUnsubscribe.mockReset();
  mockUnsubscribe.mockResolvedValue(undefined);
});

describe('registerDevice', () => {
  it('upserts a web subscription into device_tokens with endpoint as token and both keys', async () => {
    const capture = newCapture();
    useTableMock(capture);
    mockSubscribe.mockResolvedValue({
      token: WEB_ENDPOINT,
      environment: 'web',
      webPushKeys: { p256dh: P256DH, auth: AUTH },
    });

    await NotificationService.registerDevice(USER_ID);

    expect(capture.tables).toEqual(['device_tokens']);
    expect(capture.upsertRow).toEqual({
      user_id: USER_ID,
      device_token: WEB_ENDPOINT,
      environment: 'web',
      platform: 'web',
      p256dh: P256DH,
      auth: AUTH,
      last_seen_at: expect.any(String),
    });
    expect(capture.upsertOptions).toEqual({ onConflict: 'user_id,device_token' });
    await NotificationService.unregisterDevice(USER_ID);
  });

  it('upserts an APNs token as platform ios with NULL web keys', async () => {
    const capture = newCapture();
    useTableMock(capture);
    mockSubscribe.mockResolvedValue({ token: APNS_TOKEN, environment: 'production' });

    await NotificationService.registerDevice(USER_ID);

    expect(capture.upsertRow).toEqual({
      user_id: USER_ID,
      device_token: APNS_TOKEN,
      environment: 'production',
      platform: 'ios',
      p256dh: null,
      auth: null,
      last_seen_at: expect.any(String),
    });
    await NotificationService.unregisterDevice(USER_ID);
  });

  it('rejects a web subscription that arrives without keys instead of writing a malformed row', async () => {
    mockSubscribe.mockResolvedValue({ token: WEB_ENDPOINT, environment: 'web' });

    await expect(NotificationService.registerDevice(USER_ID)).rejects.toThrow(
      'Web Push subscription is missing p256dh/auth keys'
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('unregisterDevice', () => {
  it('does nothing when this session never registered a token', async () => {
    await NotificationService.unregisterDevice(USER_ID);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('deletes only the token this session registered, then releases the platform subscription', async () => {
    const capture = newCapture();
    useTableMock(capture);
    mockSubscribe.mockResolvedValue({
      token: WEB_ENDPOINT,
      environment: 'web',
      webPushKeys: { p256dh: P256DH, auth: AUTH },
    });
    await NotificationService.registerDevice(USER_ID);

    await NotificationService.unregisterDevice(USER_ID);

    expect(capture.tables).toEqual(['device_tokens', 'device_tokens']);
    expect(capture.deleteEqCalls).toEqual([
      ['user_id', USER_ID],
      ['device_token', WEB_ENDPOINT],
    ]);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('unregisterDevice with an explicit token', () => {
  it('deletes the named token even when this session registered nothing', async () => {
    const capture = newCapture();
    useTableMock(capture);

    await NotificationService.unregisterDevice(USER_ID, WEB_ENDPOINT);

    expect(capture.tables).toEqual(['device_tokens']);
    expect(capture.deleteEqCalls).toEqual([
      ['user_id', USER_ID],
      ['device_token', WEB_ENDPOINT],
    ]);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
