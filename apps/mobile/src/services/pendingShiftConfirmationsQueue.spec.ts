import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pendingShiftConfirmationsQueue,
  type PendingShiftConfirmation,
} from './pendingShiftConfirmationsQueue';
import type { ApplicationId } from '../types/ids';

const APP_A = 'app-a' as ApplicationId;
const APP_B = 'app-b' as ApplicationId;

beforeEach(async () => {
  await pendingShiftConfirmationsQueue.clear();
});

describe('pendingShiftConfirmationsQueue', () => {
  describe('enqueue', () => {
    it('adds a new action and drain processes it', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      const processed: PendingShiftConfirmation[] = [];
      const result = await pendingShiftConfirmationsQueue.drain(async action => {
        processed.push(action);
      });
      expect(processed).toEqual([
        expect.objectContaining({ applicationId: APP_A, response: 'confirmed', attempts: 0 }),
      ]);
      expect(result).toEqual({ processed: 1, dropped: 0, remaining: 0 });
    });

    it('deduplicates: enqueue with same applicationId + response is a no-op', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      const processed: PendingShiftConfirmation[] = [];
      await pendingShiftConfirmationsQueue.drain(async a => {
        processed.push(a);
      });
      expect(processed).toHaveLength(1);
    });

    it('allows different response for same applicationId', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'declined' });
      const processed: PendingShiftConfirmation[] = [];
      await pendingShiftConfirmationsQueue.drain(async a => {
        processed.push(a);
      });
      expect(processed).toHaveLength(2);
    });
  });

  describe('drain', () => {
    it('returns zeros when queue is empty', async () => {
      const result = await pendingShiftConfirmationsQueue.drain(async () => {});
      expect(result).toEqual({ processed: 0, dropped: 0, remaining: 0 });
    });

    it('keeps failed actions with incremented attempts', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      const result = await pendingShiftConfirmationsQueue.drain(async () => {
        throw new Error('network error');
      });
      expect(result).toEqual({ processed: 0, dropped: 0, remaining: 1 });

      const raw = await AsyncStorage.getItem('pendingShiftConfirmationsQueue:v1');
      const queue = JSON.parse(raw!);
      expect(queue[0].attempts).toBe(1);
    });

    it('drops action after MAX_ATTEMPTS failures', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      const fail = async () => {
        throw new Error('fail');
      };
      for (let i = 0; i < 4; i++) await pendingShiftConfirmationsQueue.drain(fail);
      const result = await pendingShiftConfirmationsQueue.drain(fail);
      expect(result).toEqual({ processed: 0, dropped: 1, remaining: 0 });
    });

    it('processes multiple actions independently', async () => {
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_A, response: 'confirmed' });
      await pendingShiftConfirmationsQueue.enqueue({ applicationId: APP_B, response: 'declined' });
      const processed: ApplicationId[] = [];
      const result = await pendingShiftConfirmationsQueue.drain(async action => {
        processed.push(action.applicationId);
      });
      expect(processed).toEqual([APP_A, APP_B]);
      expect(result).toEqual({ processed: 2, dropped: 0, remaining: 0 });
    });
  });
});
