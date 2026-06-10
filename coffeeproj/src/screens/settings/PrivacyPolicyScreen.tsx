import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Дата вступления в силу: 7 июня 2026 г.

Настоящая Политика конфиденциальности описывает, какие персональные данные собирает приложение БыстроБариста (далее — «Сервис»), как мы их используем, кому передаём и какие права у вас как у пользователя.

Используя Сервис, вы подтверждаете, что прочитали и согласны с условиями этой Политики. Если вы не согласны — пожалуйста, не используйте Сервис.

1. КТО МЫ
БыстроБариста — мобильное приложение для подбора персонала в кофейной индустрии на территории Российской Федерации.
Оператор персональных данных: физическое лицо Хаит Даниил Давидович.
Контакт для запросов по обработке персональных данных: support@quickbarista.app.

2. КАКИЕ ДАННЫЕ МЫ СОБИРАЕМ
2.1. При регистрации: адрес электронной почты, номер телефона, имя, выбранная роль (бариста / бизнес), пароль (хранится в зашифрованном виде).
2.2. В профиле: фотография, опыт работы, навыки, предпочтения по графику, для бизнеса — название заведения, адрес, фото, ИНН/ОГРН (для верификации).
2.3. При использовании Сервиса: вакансии, отклики, сообщения в чате, отзывы, жалобы, дисциплинарные взаимодействия с модератором.
2.4. Геолокация: приблизительные координаты устройства (только во время использования приложения и только с вашего согласия), чтобы показывать вакансии рядом.
2.5. Технические данные: идентификатор устройства, версия ОС, журналы сбоев, push-токен для отправки уведомлений.
2.6. При входе через сторонние сервисы (Apple, Google, Яндекс): идентификатор аккаунта и адрес электронной почты, предоставленный провайдером.

3. ЦЕЛИ ОБРАБОТКИ
— Регистрация и аутентификация пользователя.
— Подбор вакансий и кандидатов, проведение переписки сторон.
— Безопасность Сервиса, борьба с мошенничеством и нарушениями правил.
— Рассмотрение жалоб и принятие модераторских решений.
— Отправка функциональных push-уведомлений (новое сообщение, отклик, статус смены). Рекламные уведомления не отправляются.
— Исполнение требований законодательства РФ.

4. ПРАВОВЫЕ ОСНОВАНИЯ (152-ФЗ)
Обработка персональных данных осуществляется на основании вашего согласия (даётся при регистрации), а также для исполнения договора с пользователем и соблюдения требований законодательства РФ, включая Федеральный закон № 152-ФЗ «О персональных данных».

5. ПЕРЕДАЧА ТРЕТЬИМ ЛИЦАМ
Мы передаём данные третьим лицам только в следующих случаях:
— Поставщику облачной инфраструктуры (Supabase) — для хранения и обработки данных.
— Провайдерам входа (Apple, Google, Яндекс) — при использовании вами соответствующего способа авторизации.
— Apple Push Notification Service — для доставки push-уведомлений.
— Государственным органам — по законному требованию.
Мы не продаём ваши данные и не передаём их в рекламных целях.

6. СРОК ХРАНЕНИЯ
Данные хранятся, пока действует ваш аккаунт. После удаления аккаунта персональные данные удаляются в течение 30 дней, за исключением сведений, которые мы обязаны хранить по закону (например, для разрешения споров или налогового учёта).

7. ВАШИ ПРАВА
Вы вправе:
— получать доступ к своим данным и копии;
— требовать исправления неточных данных;
— требовать удаления аккаунта и связанных данных (доступно в Настройках → Удалить аккаунт);
— отозвать ранее данное согласие;
— подать жалобу в Роскомнадзор.

8. УДАЛЕНИЕ АККАУНТА
Удалить аккаунт можно прямо в приложении: Настройки → Удалить аккаунт. После подтверждения мы удаляем профиль, переписку и персональные данные. Действующие отклики и активные смены сначала необходимо завершить.

9. БЕЗОПАСНОСТЬ
Данные передаются по защищённому каналу (TLS) и хранятся в зашифрованном виде. Доступ сотрудников к персональным данным ограничен и журналируется.

10. ДЕТИ
Сервис не предназначен для лиц младше 18 лет. Если нам станет известно, что мы собрали данные несовершеннолетнего без согласия родителей, мы их удалим.

11. ИЗМЕНЕНИЯ
Мы можем обновлять Политику. О существенных изменениях уведомим в приложении или по электронной почте.

12. КОНТАКТЫ
По любым вопросам, связанным с обработкой персональных данных, пишите на support@quickbarista.app.`;

const BODY_EN = `Effective date: 7 June 2026.

This Privacy Policy explains what personal data the BystroBarista app ("Service") collects, how we use it, with whom we share it, and what rights you have as a user.

By using the Service you confirm that you have read and agree to this Policy. If you do not agree, please do not use the Service.

1. WHO WE ARE
BystroBarista is a mobile app for matching staff in the coffee industry within the Russian Federation.
Personal data operator: Khait Daniil Davidovich (individual / physical person).
Contact for personal data inquiries: support@quickbarista.app.

2. WHAT WE COLLECT
2.1. At sign-up: email address, phone number, name, selected role (barista / business), password (stored hashed).
2.2. In the profile: photo, work experience, skills, schedule preferences; for businesses — venue name, address, photos, tax IDs (for verification).
2.3. While using the Service: job listings, applications, chat messages, reviews, complaints, moderator interactions.
2.4. Location: approximate device coordinates (only while the app is in use and only with your consent) to show nearby vacancies.
2.5. Technical data: device identifier, OS version, crash logs, push token for notifications.
2.6. When signing in via third-party providers (Apple, Google, Yandex): the account identifier and email provided by the provider.

3. PURPOSES OF PROCESSING
— User registration and authentication.
— Matching vacancies with candidates and enabling communication between parties.
— Service security, fraud and abuse prevention.
— Review of complaints and moderation decisions.
— Sending functional push notifications (new message, application, shift status). We do not send promotional pushes.
— Compliance with the laws of the Russian Federation.

4. LEGAL BASIS (152-FZ)
Personal data is processed based on your consent (given at sign-up), as well as for the performance of the user agreement and compliance with the laws of the Russian Federation, including Federal Law No. 152-FZ "On Personal Data".

5. SHARING WITH THIRD PARTIES
We share data with third parties only in the following cases:
— Cloud infrastructure provider (Supabase) — for storage and processing.
— Sign-in providers (Apple, Google, Yandex) — when you use the corresponding sign-in method.
— Apple Push Notification Service — for push delivery.
— Government bodies — upon lawful request.
We do not sell your data and do not share it for advertising purposes.

6. RETENTION
Data is retained while your account is active. After account deletion, personal data is removed within 30 days, except for information we are legally required to retain (e.g., for dispute resolution or tax accounting).

7. YOUR RIGHTS
You have the right to:
— access your data and obtain a copy;
— request correction of inaccurate data;
— request deletion of your account and associated data (available in Settings → Delete account);
— withdraw previously given consent;
— file a complaint with Roskomnadzor.

8. ACCOUNT DELETION
You can delete your account directly in the app: Settings → Delete account. After confirmation we delete your profile, messages, and personal data. Active applications and ongoing shifts must be closed first.

9. SECURITY
Data is transmitted over a secure channel (TLS) and stored encrypted. Employee access to personal data is limited and logged.

10. CHILDREN
The Service is not intended for persons under 18. If we become aware that we have collected data from a minor without parental consent, we will delete it.

11. CHANGES
We may update this Policy. We will notify you of material changes in the app or by email.

12. CONTACT
For any questions about personal data processing, write to support@quickbarista.app.`;

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
