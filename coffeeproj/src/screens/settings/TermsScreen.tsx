import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Здесь будут опубликованы Условия использования перед подачей приложения в App Store.

Продолжая пользоваться приложением CoffendoZZ, вы соглашаетесь с данными условиями. Полный текст будет добавлен до коммерческого запуска.

Свяжитесь с нами по любым вопросам: support@coffendozz.ru.`;

const BODY_EN = `The full Terms of Service will be published here before the App Store submission.

By continuing to use CoffendoZZ, you agree to these terms. The complete legal text will be provided before commercial launch.

Contact us at support@coffendozz.ru for any questions.`;

export const TermsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.termsTitle') });
  }, [navigation, t]);

  const body = getCurrentLanguage() === 'ru' ? BODY_RU : BODY_EN;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.legal.termsTitle')}</Text>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
});
