import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import { ConnectivityReportPanel } from '../../components/ConnectivityReportPanel';
import { useDiagnosticsStore } from '../../stores/diagnosticsStore';

export const ConnectionErrorScreen: React.FC = () => {
  const { t } = useTranslation();
  const isLoading = useAuthStore(s => s.isLoading);
  const retryInitialize = useAuthStore(s => s.retryInitialize);
  const runProbe = useDiagnosticsStore(s => s.runProbe);

  const handleRetry = (): void => {
    void runProbe();
    void retryInitialize();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('connectionError.title')}</Text>
        <Text style={styles.body}>{t('connectionError.body')}</Text>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          disabled={isLoading}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel={t('connectionError.retry')}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('connectionError.retry')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.panel}>
          <ConnectivityReportPanel />
        </View>

        <Text style={styles.hint}>{t('connectionError.diagHint')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    marginTop: 8,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
