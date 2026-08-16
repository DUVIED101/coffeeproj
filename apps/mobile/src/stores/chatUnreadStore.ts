import { create } from 'zustand';
import { ChatService } from '../services/ChatService';

type ChatUnreadState = {
  unreadCount: number;
  refresh: (userId: string, accountType: 'barista' | 'business') => Promise<void>;
  reset: () => void;
};

export const useChatUnreadStore = create<ChatUnreadState>(set => ({
  unreadCount: 0,
  refresh: async (userId, accountType) => {
    const total = await ChatService.getTotalUnreadMessageCount(userId, accountType);
    set({ unreadCount: total });
  },
  reset: () => set({ unreadCount: 0 }),
}));
