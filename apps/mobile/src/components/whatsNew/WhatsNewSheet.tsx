import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '@bystrobarista/core/config/constants';
import { useWhatsNewStore } from '@bystrobarista/core/stores/whatsNewStore';

// One-time sheet after an app update; the store decides whether it is due.
export const WhatsNewSheet: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const status = useWhatsNewStore(s => s.status);
  const release = useWhatsNewStore(s => s.release);

  if (status !== 'visible' || !release) return null;

  const dismiss = (): void => {
    void useWhatsNewStore.getState().dismiss();
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={dismiss}
      testID="whatsNew.sheet">
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>{t('whatsNew.eyebrow')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t(release.titleKey)}
          </Text>
          {release.items.map(item => (
            <View key={item.titleKey} style={styles.item}>
              <View style={styles.bullet} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{t(item.titleKey)}</Text>
                <Text style={styles.itemBody}>{t(item.bodyKey)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.button}
            onPress={dismiss}
            accessibilityRole="button"
            activeOpacity={0.8}
            testID="whatsNew.ok">
            <Text style={styles.buttonText}>{t('whatsNew.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    marginRight: 14,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.input,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '600',
  },
});
