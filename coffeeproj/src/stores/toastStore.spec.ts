import { useToastStore } from './toastStore';
import type { Notification } from '../types/notification';
import type { NotificationId, UserId } from '../types/ids';

const makeNotification = (id: string): Notification => ({
  id: id as NotificationId,
  userId: 'user-1' as UserId,
  kind: 'new_application',
  title: 'New application',
  body: 'Body',
  data: { kind: 'new_application' },
  readAt: null,
  createdAt: new Date('2026-05-23T10:00:00.000Z'),
});

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ current: null });
  });

  it('starts with no current notification', () => {
    expect(useToastStore.getState().current).toBeNull();
  });

  it('show sets the current notification', () => {
    const n = makeNotification('n-1');
    useToastStore.getState().show(n);
    expect(useToastStore.getState().current).toEqual(n);
  });

  it('show replaces the current notification (latest wins)', () => {
    const first = makeNotification('n-1');
    const second = makeNotification('n-2');
    useToastStore.getState().show(first);
    useToastStore.getState().show(second);
    expect(useToastStore.getState().current).toEqual(second);
  });

  it('dismiss clears the current notification', () => {
    useToastStore.getState().show(makeNotification('n-1'));
    useToastStore.getState().dismiss();
    expect(useToastStore.getState().current).toBeNull();
  });
});
