import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { ConnectivityReportPanel } from '../../components/ConnectivityReportPanel';
import { useDiagnosticsStore } from '../../stores/diagnosticsStore';

export const DiagnosticScreen: React.FC = () => {
  const { t } = useTranslation();
  const runProbe = useDiagnosticsStore(s => s.runProbe);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('connectionError.diagIntro')}</Text>
        <View style={styles.panel}>
          <ConnectivityReportPanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 16 },
  intro: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  panel: { width: '100%' },
});
