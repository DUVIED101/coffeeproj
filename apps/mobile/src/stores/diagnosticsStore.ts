import { create } from 'zustand';
import {
  loadLastReport,
  runConnectivityProbe,
  type ConnectivityReport,
} from '../utils/connectivityProbe';

interface DiagnosticsState {
  lastReport: ConnectivityReport | null;
  isProbing: boolean;
  runProbe: () => Promise<ConnectivityReport>;
  loadLastReport: () => Promise<void>;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  lastReport: null,
  isProbing: false,

  runProbe: async () => {
    if (get().isProbing) {
      const existing = get().lastReport;
      if (existing) return existing;
    }
    set({ isProbing: true });
    try {
      const report = await runConnectivityProbe();
      set({ lastReport: report });
      return report;
    } finally {
      set({ isProbing: false });
    }
  },

  loadLastReport: async () => {
    const report = await loadLastReport();
    if (report) set({ lastReport: report });
  },
}));
