import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL } from '@env';
import { COLORS } from '../config/constants';
import { useDiagnosticsStore } from '../stores/diagnosticsStore';
import type { ConnectivityReport, ProbeTargetId } from '../utils/connectivityProbe';
import { APP_VERSION } from '../config/version';
import { FORCE_PROXY_STORAGE_KEY, PROXY_URL } from '../config/supabaseHost';

const labelKey = (id: ProbeTargetId): string => `connectionError.probe.${id}`;

const buildDiagnosticText = (report: ConnectivityReport | null): string => {
  if (!report) return '';
  const lines = report.results.map(r => {
    if (r.ok) return `${r.target}: ok ${r.durationMs}ms (status ${r.status ?? 'n/a'})`;
    return `${r.target}: FAIL ${r.errorName ?? 'http'} ${r.errorMessage ?? r.status ?? ''}`.trim();
  });
  lines.push(`url: ${SUPABASE_URL}`);
  if (PROXY_URL) lines.push(`proxy: ${PROXY_URL}`);
  lines.push(`app: ${APP_VERSION}`);
  try {
    lines.push(`tz: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  } catch {
    // ignore
  }
  lines.push(`checked: ${report.finishedAt}`);
  return lines.join('\n');
};

export const ConnectivityReportPanel: React.FC = () => {
  const { t } = useTranslation();
  const report = useDiagnosticsStore(s => s.lastReport);
  const isProbing = useDiagnosticsStore(s => s.isProbing);
  const runProbe = useDiagnosticsStore(s => s.runProbe);

  const diagnosticText = useMemo(() => buildDiagnosticText(report), [report]);

  const [forceProxy, setForceProxy] = useState<boolean>(false);
  useEffect(() => {
    void AsyncStorage.getItem(FORCE_PROXY_STORAGE_KEY).then(v => setForceProxy(v === 'true'));
  }, []);
  const toggleForceProxy = useCallback(async (next: boolean) => {
    setForceProxy(next);
    await AsyncStorage.setItem(FORCE_PROXY_STORAGE_KEY, next ? 'true' : 'false');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('connectionError.diagDetailsTitle')}</Text>

      {report ? (
        <View style={styles.results}>
          {report.results.map(r => (
            <View key={r.target} style={styles.row}>
              <View style={[styles.dot, r.ok ? styles.dotOk : styles.dotFail]} />
              <Text style={styles.targetLabel}>{t(labelKey(r.target))}</Text>
              <Text style={[styles.status, r.ok ? styles.statusOk : styles.statusFail]}>
                {r.ok
                  ? t('connectionError.probe.reachable')
                  : t('connectionError.probe.unreachable')}
              </Text>
              <Text style={styles.latency}>
                {t('connectionError.probe.latencyMs', { ms: r.durationMs })}
              </Text>
            </View>
          ))}
          <Text style={styles.lastRun}>
            {t('connectionError.probe.lastRunAt', { time: report.finishedAt })}
          </Text>
        </View>
      ) : (
        <Text style={styles.noReport}>{t('connectionError.probe.noReport')}</Text>
      )}

      <TouchableOpacity
        style={[styles.secondaryButton, isProbing && styles.buttonDisabled]}
        disabled={isProbing}
        onPress={() => {
          void runProbe();
        }}>
        {isProbing ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>{t('connectionError.rerunCheck')}</Text>
        )}
      </TouchableOpacity>

      {PROXY_URL ? (
        <View style={styles.toggleBlock}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('connectionError.forceProxy.label')}</Text>
            <Switch
              value={forceProxy}
              onValueChange={v => {
                void toggleForceProxy(v);
              }}
            />
          </View>
          <Text style={styles.toggleHelp}>{t('connectionError.forceProxy.help')}</Text>
          <Text style={styles.toggleHelp}>{t('connectionError.forceProxy.restartHint')}</Text>
        </View>
      ) : null}

      {diagnosticText.length > 0 ? (
        <View style={styles.copyBlock}>
          <Text style={styles.copyLabel}>{t('connectionError.copyInfo')}</Text>
          <TextInput
            style={styles.copyText}
            value={diagnosticText}
            multiline
            editable={false}
            selectTextOnFocus
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  results: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOk: { backgroundColor: COLORS.success },
  dotFail: { backgroundColor: COLORS.error },
  targetLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusOk: { color: COLORS.success },
  statusFail: { color: COLORS.error },
  latency: {
    fontSize: 12,
    color: COLORS.textSecondary,
    minWidth: 64,
    textAlign: 'right',
  },
  lastRun: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  noReport: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  copyBlock: {
    gap: 6,
  },
  copyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  copyText: {
    fontSize: 12,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleBlock: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  toggleHelp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
