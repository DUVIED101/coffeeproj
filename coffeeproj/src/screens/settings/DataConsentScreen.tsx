import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Дата вступления в силу: 12 июня 2026 г.

Настоящее Согласие на обработку персональных данных (далее — «Согласие») предоставляется субъектом персональных данных (далее — «Пользователь») оператору — Хаиту Даниилу Давидовичу (далее — «Оператор»), осуществляющему обработку персональных данных Пользователя в связи с использованием мобильного приложения «БыстроБариста» (далее — «Приложение»).

1. ПРЕДМЕТ СОГЛАСИЯ
Принимая настоящее Согласие при регистрации в Приложении (путём проставления соответствующей отметки на экране регистрации), Пользователь, действуя свободно, своей волей и в своём интересе, в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — «152-ФЗ») даёт Оператору согласие на обработку своих персональных данных на условиях, изложенных в настоящем документе и в Политике в отношении обработки персональных данных Оператора.

2. ОПЕРАТОР
Оператор: Хаит Даниил Давидович (физическое лицо).
Контактный адрес для запросов по обработке персональных данных: bystrobarista@gmail.com.

3. ПЕРЕЧЕНЬ ПЕРСОНАЛЬНЫХ ДАННЫХ, НА ОБРАБОТКУ КОТОРЫХ ДАЁТСЯ СОГЛАСИЕ
3.1. Регистрационные данные: адрес электронной почты, номер телефона, имя, выбранная роль (бариста / бизнес), пароль (хранится в зашифрованном виде).
3.2. Данные профиля: фотография, опыт работы, навыки, предпочтения по графику; для бизнес-аккаунтов — название заведения, адрес, фотографии заведения, ИНН/ОГРН (при верификации).
3.3. Контент, создаваемый при использовании Приложения: вакансии, отклики, сообщения в чатах, отзывы, жалобы и связанные с ними материалы.
3.4. Данные о геопозиции: приблизительные координаты устройства (только во время использования Приложения и только при наличии отдельного согласия Пользователя в системных настройках устройства).
3.5. Технические данные: идентификатор устройства, версия операционной системы, журналы сбоев, push-токен для отправки уведомлений.
3.6. Данные, полученные от сторонних провайдеров входа (Apple, Google, Яндекс) при выборе соответствующего способа авторизации: идентификатор аккаунта и адрес электронной почты, предоставленный провайдером.

4. ЦЕЛИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
Пользователь даёт согласие на обработку персональных данных в следующих целях:
— регистрация и аутентификация Пользователя в Приложении;
— подбор вакансий и кандидатов в кофейной индустрии, обеспечение коммуникации между Пользователями (отклики, чаты, согласование смен);
— обеспечение безопасности Приложения, борьба с мошенничеством и нарушениями правил;
— рассмотрение жалоб и принятие модераторских решений;
— отправка функциональных push-уведомлений (новое сообщение, отклик, статус смены); рекламные уведомления не отправляются;
— исполнение требований законодательства Российской Федерации.
Обработка персональных данных Пользователя в иных целях не допускается без получения отдельного согласия.

5. ПЕРЕЧЕНЬ ДЕЙСТВИЙ С ПЕРСОНАЛЬНЫМИ ДАННЫМИ
Согласие даётся на следующие действия (операции) с персональными данными: сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление, доступ), обезличивание, блокирование, удаление, уничтожение, передача данных третьим лицам в случаях, указанных в пункте 6 настоящего Согласия.

6. ПЕРЕДАЧА ПЕРСОНАЛЬНЫХ ДАННЫХ ТРЕТЬИМ ЛИЦАМ
Пользователь даёт согласие на передачу персональных данных следующим третьим лицам в объёме, необходимом для оказания услуг:
— поставщику облачной инфраструктуры Supabase Inc. (для хранения и обработки данных);
— провайдерам входа Apple, Google, ООО «ЯНДЕКС» (при использовании Пользователем соответствующего способа авторизации);
— Apple Push Notification Service (для доставки push-уведомлений на устройство Пользователя);
— государственным органам — по законному требованию.
Оператор не передаёт персональные данные Пользователя в рекламных целях и не продаёт их.

7. СПОСОБЫ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
Обработка персональных данных осуществляется как с использованием средств автоматизации, так и без таковых.

8. СРОК ДЕЙСТВИЯ СОГЛАСИЯ И ПОРЯДОК ЕГО ОТЗЫВА
8.1. Согласие даётся бессрочно и действует с момента его предоставления до момента его отзыва Пользователем либо до достижения целей обработки персональных данных.
8.2. Согласие может быть отозвано Пользователем в любой момент:
— направлением Оператору письменного уведомления об отзыве согласия на адрес электронной почты bystrobarista@gmail.com с пометкой «Отзыв согласия на обработку персональных данных»;
— либо самостоятельным удалением аккаунта в Приложении в разделе Настройки → Удалить аккаунт.
8.3. После получения отзыва согласия Оператор прекращает обработку персональных данных в срок, не превышающий 30 (тридцать) календарных дней, за исключением случаев, когда обработка данных продолжается на основании пункта 2 статьи 9 152-ФЗ (исполнение договора, требование закона и иные основания).
8.4. Пользователь подтверждает, что осведомлён о том, что отзыв согласия может повлечь невозможность дальнейшего использования Приложения.

9. ПРАВА ПОЛЬЗОВАТЕЛЯ
Пользователь имеет право на доступ к своим персональным данным, на их уточнение, блокирование или уничтожение в случаях, предусмотренных 152-ФЗ, на отзыв настоящего Согласия, а также на обжалование действий или бездействия Оператора в Роскомнадзоре или в судебном порядке.

10. ПОДТВЕРЖДЕНИЕ
Проставляя отметку «Даю согласие на обработку персональных данных» на экране регистрации, Пользователь подтверждает, что:
— ознакомлен с настоящим Согласием и Политикой в отношении обработки персональных данных Оператора;
— осознаёт характер и объём предоставляемых им персональных данных, а также цели и способы их обработки;
— даёт Оператору согласие на обработку своих персональных данных на условиях, указанных в настоящем документе.`;

const BODY_EN = `Effective date: 12 June 2026.

This Consent to the Processing of Personal Data ("Consent") is given by the data subject ("User") to the operator — Daniil Davidovich Khait ("Operator"), who processes the User's personal data in connection with the use of the BystroBarista mobile application ("App").

1. SUBJECT OF CONSENT
By accepting this Consent at registration in the App (by ticking the corresponding checkbox on the sign-up screen), the User, acting freely, of their own will and in their own interest, in accordance with Federal Law No. 152-FZ of 27 July 2006 "On Personal Data" ("152-FZ"), gives the Operator consent to process their personal data on the terms set out in this document and in the Operator's Personal Data Processing Policy.

2. OPERATOR
Operator: Daniil Davidovich Khait (natural person).
Contact for personal data inquiries: bystrobarista@gmail.com.

3. PERSONAL DATA COVERED BY THIS CONSENT
3.1. Registration data: email address, phone number, name, selected role (barista / business), password (stored hashed).
3.2. Profile data: photo, work experience, skills, schedule preferences; for business accounts — venue name, address, venue photos, tax IDs (during verification).
3.3. Content created while using the App: vacancies, applications, chat messages, reviews, complaints, and related materials.
3.4. Location data: approximate device coordinates (only while the App is in use and only with the User's separate consent given through the device's system settings).
3.5. Technical data: device identifier, OS version, crash logs, push token for notifications.
3.6. Data received from third-party sign-in providers (Apple, Google, Yandex) when the corresponding sign-in method is chosen: account identifier and email address provided by the provider.

4. PURPOSES OF PROCESSING
The User consents to the processing of personal data for the following purposes:
— User registration and authentication in the App;
— matching vacancies and candidates in the coffee industry, enabling communication between Users (applications, chats, shift coordination);
— security of the App, fraud and abuse prevention;
— review of complaints and moderation decisions;
— delivery of functional push notifications (new message, application, shift status); promotional notifications are not sent;
— compliance with the laws of the Russian Federation.
Processing of the User's personal data for any other purposes is not permitted without a separate consent.

5. LIST OF OPERATIONS
This Consent covers the following operations with personal data: collection, recording, systematization, accumulation, storage, clarification (updating, modification), retrieval, use, transfer (provision, access), depersonalization, blocking, deletion, destruction, and transfer of data to third parties in the cases specified in clause 6 below.

6. TRANSFER TO THIRD PARTIES
The User consents to the transfer of personal data to the following third parties, to the extent necessary to provide the service:
— cloud infrastructure provider Supabase Inc. (for storage and processing);
— sign-in providers Apple, Google, Yandex LLC (when the User uses the corresponding sign-in method);
— Apple Push Notification Service (for delivery of push notifications to the User's device);
— government authorities — upon lawful request.
The Operator does not transfer the User's personal data for advertising purposes and does not sell it.

7. METHODS OF PROCESSING
Personal data is processed both with and without the use of automation.

8. TERM OF CONSENT AND WITHDRAWAL
8.1. This Consent is given for an indefinite term and is in force from the moment it is given until it is withdrawn by the User, or until the purposes of processing are achieved.
8.2. The User may withdraw consent at any time by:
— sending the Operator a written notice of withdrawal to bystrobarista@gmail.com marked "Withdrawal of consent to personal data processing";
— or by deleting the account directly in the App in Settings → Delete account.
8.3. Upon receiving the withdrawal of consent, the Operator stops processing personal data within no more than 30 (thirty) calendar days, except for cases where processing continues on the grounds of clause 2 of Article 9 of 152-FZ (performance of a contract, requirement of law, and other statutory grounds).
8.4. The User acknowledges that withdrawal of consent may make further use of the App impossible.

9. USER RIGHTS
The User has the right to access their personal data, to request its clarification, blocking, or destruction in the cases provided for by 152-FZ, to withdraw this Consent, and to appeal the Operator's actions or inaction to Roskomnadzor or in court.

10. CONFIRMATION
By ticking the "I consent to the processing of personal data" checkbox on the sign-up screen, the User confirms that:
— they have read this Consent and the Operator's Personal Data Processing Policy;
— they understand the nature and scope of the personal data they provide, as well as the purposes and methods of its processing;
— they give the Operator consent to process their personal data on the terms set out in this document.`;

export const DataConsentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.dataConsentTitle') });
  }, [navigation, t]);

  const body = getCurrentLanguage() === 'ru' ? BODY_RU : BODY_EN;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.legal.dataConsentTitle')}</Text>
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
