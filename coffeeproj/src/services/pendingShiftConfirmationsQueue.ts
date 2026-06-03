import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApplicationId } from '../types/ids';

const STORAGE_KEY = 'pendingShiftConfirmationsQueue:v1';
const MAX_ATTEMPTS = 5;

export type PendingShiftConfirmation = {
  applicationId: ApplicationId;
  response: 'confirmed' | 'declined';
  attempts: number;
  queuedAt: string;
};

async function readQueue(): Promise<PendingShiftConfirmation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingShiftConfirmation[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingShiftConfirmation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const pendingShiftConfirmationsQueue = {
  async enqueue(action: Omit<PendingShiftConfirmation, 'attempts' | 'queuedAt'>): Promise<void> {
    const queue = await readQueue();
    if (
      queue.some(q => q.applicationId === action.applicationId && q.response === action.response)
    ) {
      return;
    }
    queue.push({ ...action, attempts: 0, queuedAt: new Date().toISOString() });
    await writeQueue(queue);
  },

  async drain(
    processor: (action: PendingShiftConfirmation) => Promise<void>
  ): Promise<{ processed: number; dropped: number; remaining: number }> {
    const queue = await readQueue();
    if (queue.length === 0) return { processed: 0, dropped: 0, remaining: 0 };

    const remaining: PendingShiftConfirmation[] = [];
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
          console.warn('pendingShiftConfirmationsQueue: dropping action after max attempts', {
            applicationId: action.applicationId,
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
