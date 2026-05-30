import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Здесь будет опубликована Политика конфиденциальности перед подачей приложения в App Store.

CoffendoZZ собирает минимально необходимые данные для работы сервиса: email, номер телефона, профиль бариста или бизнеса, геолокацию (только для поиска вакансий). Полный текст будет добавлен до коммерческого запуска.

Свяжитесь с нами по любым вопросам конфиденциальности: support@coffendozz.ru.`;

const BODY_EN = `The full Privacy Policy will be published here before the App Store submission.

CoffendoZZ collects the minimum data required to operate the service: email, phone number, barista or business profile, and geolocation (only for job search). The complete legal text will be provided before commercial launch.

Contact us at support@coffendozz.ru for any privacy-related questions.`;

export const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.privacyTitle') });
  }, [navigation, t]);

  const body = getCurrentLanguage() === 'ru' ? BODY_RU : BODY_EN;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.legal.privacyTitle')}</Text>
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
