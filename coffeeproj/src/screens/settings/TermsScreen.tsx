import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Дата вступления в силу: 7 июня 2026 г.

Настоящие Условия использования регулируют ваш доступ и использование мобильного приложения БыстроБариста (далее — «Сервис»). Регистрируясь или используя Сервис, вы соглашаетесь с этими Условиями.

1. ОПИСАНИЕ СЕРВИСА
БыстроБариста — площадка для подбора персонала в кофейной индустрии. Бариста могут искать вакансии и откликаться на них; кофейни и сети заведений могут размещать вакансии, рассматривать кандидатов, принимать или отклонять отклики. Сервис выступает посредником и не является работодателем ни для одной из сторон.

2. РЕГИСТРАЦИЯ И АККАУНТ
2.1. Использовать Сервис могут лица, достигшие 18 лет.
2.2. При регистрации вы обязуетесь предоставлять достоверные сведения и поддерживать их в актуальном состоянии.
2.3. Вы несёте ответственность за сохранность пароля и за все действия, совершённые с вашего аккаунта.
2.4. Один аккаунт принадлежит одному пользователю. Передача аккаунта запрещена.

3. ПРАВИЛА ПОВЕДЕНИЯ
Запрещается:
— размещать ложные, мошеннические или вводящие в заблуждение вакансии или профили;
— использовать Сервис для оскорблений, домогательств, угроз или дискриминации;
— публиковать контент, нарушающий законы РФ или права третьих лиц;
— пытаться обойти проверки безопасности, использовать ботов или автоматизированный сбор данных;
— использовать Сервис для деятельности, не связанной с подбором персонала в кофейной индустрии;
— выдавать себя за другое лицо или организацию.

4. ПОЛЬЗОВАТЕЛЬСКИЙ КОНТЕНТ И МОДЕРАЦИЯ
4.1. Вы остаётесь правообладателем контента, который размещаете (фото, текст вакансии, сообщения), но предоставляете Сервису неисключительную лицензию на его хранение и показ в рамках работы Сервиса.
4.2. Сервис модерирует контент на основании жалоб пользователей и проактивных проверок. Любой пользователь может пожаловаться на контент или другого пользователя через кнопку «Пожаловаться».
4.3. Модератор рассматривает жалобы в разумные сроки и вправе скрыть контент, ограничить функциональность, приостановить или удалить аккаунт нарушителя.
4.4. Возможна функция блокировки пользователя на уровне аккаунта.

5. ПРИОСТАНОВКА И ПРЕКРАЩЕНИЕ ДОСТУПА
Мы вправе приостановить или прекратить доступ к Сервису, если вы нарушаете эти Условия, по требованию закона или для защиты других пользователей. Вы можете удалить аккаунт самостоятельно в любой момент: Настройки → Удалить аккаунт.

6. ПЛАТНЫЕ УСЛУГИ
На момент публикации этих Условий все функции Сервиса предоставляются бесплатно. Если в будущем появятся платные функции, условия их оплаты будут опубликованы отдельно и не вступят в силу без вашего согласия.

7. ОТКАЗ ОТ ГАРАНТИЙ
Сервис предоставляется «как есть». Мы не гарантируем, что Сервис будет работать без перебоев, что вакансии будут актуальны или что вы найдёте подходящего кандидата либо работодателя. Мы не отвечаем за действия других пользователей и не являемся стороной трудовых или гражданско-правовых отношений между ними.

8. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ
В пределах, допустимых законодательством, Сервис не несёт ответственности за упущенную выгоду, косвенные убытки и любые суммы, превышающие то, что вы заплатили за использование Сервиса за последние 12 месяцев.

9. ПРИМЕНИМОЕ ПРАВО И ПОДСУДНОСТЬ
К Условиям применяется законодательство Российской Федерации. Споры рассматриваются в судах по месту нахождения оператора Сервиса, если иное не предусмотрено законом о защите прав потребителей.

10. ИЗМЕНЕНИЯ
Мы можем обновлять Условия. Об существенных изменениях уведомим в приложении. Продолжая использовать Сервис после изменений, вы соглашаетесь с новой редакцией.

11. КОНТАКТЫ
По вопросам, связанным с Условиями, пишите на support@quickbarista.app.`;

const BODY_EN = `Effective date: 7 June 2026.

These Terms of Service govern your access to and use of the BystroBarista mobile app ("Service"). By registering or using the Service, you agree to these Terms.

1. SERVICE DESCRIPTION
BystroBarista is a marketplace for staffing in the coffee industry. Baristas can browse vacancies and apply to them; coffee shops and chains can post vacancies, review candidates, and accept or reject applications. The Service acts as an intermediary and is not an employer of any party.

2. SIGN-UP AND ACCOUNT
2.1. You must be at least 18 years old to use the Service.
2.2. When signing up you agree to provide accurate information and keep it up to date.
2.3. You are responsible for safeguarding your password and for all activity performed under your account.
2.4. One account belongs to one person. Account transfer is prohibited.

3. RULES OF CONDUCT
You may not:
— post false, fraudulent, or misleading vacancies or profiles;
— use the Service for insults, harassment, threats, or discrimination;
— post content that violates the laws of the Russian Federation or third-party rights;
— attempt to bypass security checks, use bots, or scrape data;
— use the Service for activity unrelated to coffee-industry staffing;
— impersonate another person or organization.

4. USER CONTENT AND MODERATION
4.1. You retain ownership of content you submit (photos, vacancy text, messages), but you grant the Service a non-exclusive license to store and display it as needed to operate the Service.
4.2. The Service moderates content based on user reports and proactive checks. Any user can report content or another user via the "Report" button.
4.3. Moderators review reports within a reasonable time and may hide content, restrict functionality, suspend, or delete the offender's account.
4.4. Account-level user blocking may be available.

5. SUSPENSION AND TERMINATION
We may suspend or terminate your access if you violate these Terms, as required by law, or to protect other users. You can delete your account at any time: Settings → Delete account.

6. PAID FEATURES
As of publication of these Terms, all features of the Service are provided free of charge. If paid features are added in the future, the payment terms will be published separately and will not take effect without your consent.

7. DISCLAIMER OF WARRANTIES
The Service is provided "as is". We do not warrant that the Service will operate without interruption, that vacancies will be current, or that you will find a suitable candidate or employer. We are not responsible for the actions of other users and are not a party to any employment or civil-law relationship between them.

8. LIMITATION OF LIABILITY
To the extent permitted by law, the Service is not liable for lost profits, indirect damages, or any amount exceeding what you paid for the Service over the last 12 months.

9. GOVERNING LAW AND JURISDICTION
These Terms are governed by the laws of the Russian Federation. Disputes are heard in courts at the location of the Service operator, except as otherwise required by consumer-protection law.

10. CHANGES
We may update these Terms. We will notify you of material changes in the app. Continued use of the Service after changes means you accept the new version.

11. CONTACT
For any questions about these Terms, write to support@quickbarista.app.`;

export const TermsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.termsTitle') });
  }, [navigation, t]);

  const body = getCurrentLanguage() === 'ru' ? BODY_RU : BODY_EN;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
