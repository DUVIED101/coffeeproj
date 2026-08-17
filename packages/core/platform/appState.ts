export type AppStatus = 'active' | 'background' | 'inactive';

export type AppStateAdapter = {
  getCurrentState(): AppStatus;
  // Emits on every state change. Returns an unsubscribe function.
  addListener(handler: (status: AppStatus) => void): () => void;
};
