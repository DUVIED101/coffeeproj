import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JobOfferId } from '../types/ids';

const STORAGE_KEY = 'pendingOfferActionsQueue:v1';
const MAX_ATTEMPTS = 5;

export type PendingOfferAction = {
  offerId: JobOfferId;
  response: 'accepted' | 'declined';
  attempts: number;
  queuedAt: string;
};

async function readQueue(): Promise<PendingOfferAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingOfferAction[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingOfferAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const pendingOfferActionsQueue = {
  async enqueue(action: Omit<PendingOfferAction, 'attempts' | 'queuedAt'>): Promise<void> {
    const queue = await readQueue();
    if (queue.some(q => q.offerId === action.offerId && q.response === action.response)) {
      return;
    }
    queue.push({ ...action, attempts: 0, queuedAt: new Date().toISOString() });
    await writeQueue(queue);
  },

  /**
   * Drains the queue by invoking `processor` for each pending action.
   * Successful actions are removed; failures increment attempts and are
   * dropped once they exceed MAX_ATTEMPTS to avoid infinite retries.
   */
  async drain(
    processor: (action: PendingOfferAction) => Promise<void>
  ): Promise<{ processed: number; dropped: number; remaining: number }> {
    const queue = await readQueue();
    if (queue.length === 0) return { processed: 0, dropped: 0, remaining: 0 };

    const remaining: PendingOfferAction[] = [];
    let processed = 0;
    let dropped = 0;

    for (const action of queue) {
      try {
        await processor(action);
        processed += 1;
      } catch (err) {
        const nextAttempts = action.attempts + 1;
        if (nextAttempts >= MAX_ATTEMPTS) {
          dropped += 1;
          console.warn('pendingOfferActionsQueue: dropping action after max attempts', {
            offerId: action.offerId,
            response: action.response,
            err: String(err),
          });
        } else {
          remaining.push({ ...action, attempts: nextAttempts });
        }
      }
    }

    await writeQueue(remaining);
    return { processed, dropped, remaining: remaining.length };
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
