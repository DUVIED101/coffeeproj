import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Дата вступления в силу: 12 июня 2026 г.

1. ОБЩИЕ ПОЛОЖЕНИЯ
Настоящая Политика в отношении обработки персональных данных (далее — Политика) составлена в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — Закон о персональных данных) и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые Хаитом Даниилом Давидовичем (далее — Оператор).
1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.
1.2. Настоящая Политика применяется ко всей информации, которую Оператор может получить о пользователях мобильного приложения «БыстроБариста» (далее — Приложение) и связанного с ним сайта bystrobarista.com.

2. ОСНОВНЫЕ ПОНЯТИЯ, ИСПОЛЬЗУЕМЫЕ В ПОЛИТИКЕ
2.1. Автоматизированная обработка персональных данных — обработка персональных данных с помощью средств вычислительной техники.
2.2. Блокирование персональных данных — временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных).
2.3. Приложение — программа для ЭВМ «БыстроБариста», предназначенная для подбора персонала в кофейной индустрии, доступная для установки на мобильные устройства Пользователей в магазинах приложений.
2.4. Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных и обеспечивающих их обработку информационных технологий и технических средств.
2.5. Обезличивание персональных данных — действия, в результате которых невозможно определить без использования дополнительной информации принадлежность персональных данных конкретному Пользователю или иному субъекту персональных данных.
2.6. Обработка персональных данных — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных.
2.7. Оператор — государственный орган, муниципальный орган, юридическое или физическое лицо, самостоятельно или совместно с другими лицами организующие и/или осуществляющие обработку персональных данных, а также определяющие цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции), совершаемые с персональными данными.
2.8. Персональные данные — любая информация, относящаяся прямо или косвенно к определенному или определяемому Пользователю Приложения.
2.9. Пользователь — любое физическое лицо, использующее Приложение, в том числе зарегистрировавшее аккаунт в роли «бариста» или «бизнес».
2.10. Предоставление персональных данных — действия, направленные на раскрытие персональных данных определенному лицу или определенному кругу лиц.
2.11. Распространение персональных данных — любые действия, направленные на раскрытие персональных данных неопределенному кругу лиц.
2.12. Трансграничная передача персональных данных — передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу.
2.13. Уничтожение персональных данных — любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью дальнейшего восстановления содержания персональных данных в информационной системе персональных данных и/или уничтожаются материальные носители персональных данных.

3. ОСНОВНЫЕ ПРАВА И ОБЯЗАННОСТИ ОПЕРАТОРА
3.1. Оператор имеет право:
— получать от субъекта персональных данных достоверные информацию и/или документы, содержащие персональные данные;
— в случае отзыва субъектом персональных данных согласия на обработку персональных данных продолжить обработку персональных данных без согласия субъекта при наличии оснований, указанных в Законе о персональных данных;
— самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения выполнения обязанностей, предусмотренных Законом о персональных данных и принятыми в соответствии с ним нормативными правовыми актами.
3.2. Оператор обязан:
— предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных;
— организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ;
— отвечать на обращения и запросы субъектов персональных данных и их законных представителей в соответствии с требованиями Закона о персональных данных;
— сообщать в уполномоченный орган по защите прав субъектов персональных данных (Роскомнадзор) по запросу этого органа необходимую информацию в течение 10 дней с даты получения запроса;
— публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике;
— принимать правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа к ним, уничтожения, изменения, блокирования, копирования, предоставления, распространения, а также от иных неправомерных действий;
— прекратить передачу (распространение, предоставление, доступ) персональных данных, прекратить обработку и уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных;
— исполнять иные обязанности, предусмотренные Законом о персональных данных.

4. ОСНОВНЫЕ ПРАВА И ОБЯЗАННОСТИ СУБЪЕКТОВ ПЕРСОНАЛЬНЫХ ДАННЫХ
4.1. Субъекты персональных данных имеют право:
— получать информацию, касающуюся обработки его персональных данных, за исключением случаев, предусмотренных федеральными законами;
— требовать от Оператора уточнения его персональных данных, их блокирования или уничтожения в случае, если персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки;
— на отзыв согласия на обработку персональных данных, а также на направление требования о прекращении обработки персональных данных;
— обжаловать в уполномоченный орган по защите прав субъектов персональных данных (Роскомнадзор) или в судебном порядке неправомерные действия или бездействие Оператора при обработке его персональных данных;
— на осуществление иных прав, предусмотренных законодательством РФ.
4.2. Субъекты персональных данных обязаны:
— предоставлять Оператору достоверные данные о себе;
— сообщать Оператору об уточнении (обновлении, изменении) своих персональных данных.
4.3. Лица, передавшие Оператору недостоверные сведения о себе либо сведения о другом субъекте персональных данных без согласия последнего, несут ответственность в соответствии с законодательством РФ.

5. ПРИНЦИПЫ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
5.1. Обработка персональных данных осуществляется на законной и справедливой основе.
5.2. Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей. Не допускается обработка персональных данных, несовместимая с целями сбора персональных данных.
5.3. Не допускается объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях, несовместимых между собой.
5.4. Обработке подлежат только персональные данные, которые отвечают целям их обработки.
5.5. Содержание и объем обрабатываемых персональных данных соответствуют заявленным целям обработки. Не допускается избыточность обрабатываемых персональных данных по отношению к заявленным целям их обработки.
5.6. При обработке персональных данных обеспечивается точность персональных данных, их достаточность, а в необходимых случаях и актуальность по отношению к целям обработки персональных данных.
5.7. Хранение персональных данных осуществляется в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения не установлен федеральным законом или договором.

6. ЦЕЛИ ОБРАБОТКИ И СОСТАВ ПЕРСОНАЛЬНЫХ ДАННЫХ
6.1. Цели обработки персональных данных:
— регистрация и аутентификация Пользователя в Приложении;
— подбор вакансий и кандидатов в кофейной индустрии и обеспечение взаимодействия сторон (отклики, чаты, согласование смен);
— обеспечение безопасности Сервиса, борьба с мошенничеством и нарушениями правил Приложения;
— рассмотрение жалоб и принятие модераторских решений;
— отправка функциональных push-уведомлений (новое сообщение, отклик, статус смены); рекламные уведомления не отправляются;
— исполнение требований законодательства Российской Федерации.
6.2. Состав обрабатываемых персональных данных:
— адрес электронной почты, имя, выбранная роль (бариста / бизнес), пароль (хранится в зашифрованном виде);
— сведения профиля: фотография, опыт работы, навыки, предпочтения по графику; для бизнеса — название заведения, адрес, фото, ИНН/ОГРН (при верификации);
— содержание откликов, чатов, отзывов и жалоб, поданных в Приложении;
— приблизительные координаты устройства (только во время использования Приложения и только с согласия Пользователя);
— технические данные: идентификатор устройства, версия ОС, журналы сбоев, push-токен;
— при входе через сторонние сервисы (Apple, Google, Яндекс) — идентификатор аккаунта и адрес электронной почты, предоставленный провайдером.
6.3. Правовые основания: Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных», Федеральный закон от 27.07.2006 № 149-ФЗ «Об информации, информационных технологиях и о защите информации», согласие субъекта персональных данных, заключённый с субъектом договор (Условия использования Приложения).
6.4. Специальные категории персональных данных (раса, национальность, политические взгляды, религиозные или философские убеждения, состояние здоровья, интимная жизнь) Оператором не запрашиваются и не обрабатываются.

7. УСЛОВИЯ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ
7.1. Обработка персональных данных осуществляется с согласия субъекта персональных данных на обработку его персональных данных.
7.2. Обработка персональных данных необходима для достижения целей, предусмотренных международным договором Российской Федерации или законом, для осуществления возложенных законодательством Российской Федерации на Оператора функций, полномочий и обязанностей.
7.3. Обработка персональных данных необходима для исполнения договора, стороной которого либо выгодоприобретателем или поручителем по которому является субъект персональных данных, а также для заключения договора по инициативе субъекта персональных данных.
7.4. Обработка персональных данных необходима для осуществления прав и законных интересов Оператора или третьих лиц либо для достижения общественно значимых целей при условии, что при этом не нарушаются права и свободы субъекта персональных данных.
7.5. Осуществляется обработка персональных данных, доступ неограниченного круга лиц к которым предоставлен субъектом персональных данных либо по его просьбе.
7.6. Осуществляется обработка персональных данных, подлежащих опубликованию или обязательному раскрытию в соответствии с федеральным законом.

8. ПОРЯДОК СБОРА, ХРАНЕНИЯ, ПЕРЕДАЧИ И ДРУГИХ ВИДОВ ОБРАБОТКИ
Безопасность персональных данных, которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных.
8.1. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к персональным данным неуполномоченных лиц. Данные передаются по защищённому каналу (TLS) и хранятся в зашифрованном виде.
8.2. Персональные данные Пользователя не будут переданы третьим лицам, за исключением случаев:
— передачи поставщику облачной инфраструктуры (Supabase Inc.) — для хранения и обработки данных;
— передачи провайдерам входа (Apple, Google, Яндекс) — при использовании Пользователем соответствующего способа авторизации;
— передачи Apple Push Notification Service — для доставки push-уведомлений;
— передачи государственным органам — по законному требованию;
— случаев, когда субъектом персональных данных дано отдельное согласие на передачу данных третьему лицу.
Оператор не продаёт персональные данные и не передаёт их в рекламных целях.
8.3. В случае выявления неточностей в персональных данных Пользователь может актуализировать их самостоятельно через Приложение (раздел «Профиль») либо путем направления Оператору уведомления на адрес электронной почты bystrobarista@gmail.com с пометкой «Актуализация персональных данных».
8.4. Срок обработки персональных данных определяется достижением целей, для которых были собраны персональные данные, если иной срок не предусмотрен договором или действующим законодательством. Пользователь может в любой момент отозвать своё согласие на обработку персональных данных, направив Оператору уведомление по адресу bystrobarista@gmail.com с пометкой «Отзыв согласия на обработку персональных данных», либо удалив аккаунт в разделе Настройки → Удалить аккаунт. После удаления аккаунта персональные данные удаляются в течение 30 дней, за исключением сведений, которые Оператор обязан хранить по закону.
8.5. Вся информация, которая собирается сторонними сервисами, в том числе платежными системами, средствами связи и другими поставщиками услуг, хранится и обрабатывается указанными лицами (Операторами) в соответствии с их Пользовательским соглашением и Политикой конфиденциальности. Оператор не несёт ответственности за действия третьих лиц, в том числе указанных в настоящем пункте поставщиков услуг.
8.6. Оператор при обработке персональных данных обеспечивает их конфиденциальность.
8.7. Оператор осуществляет хранение персональных данных в форме, позволяющей определить субъекта персональных данных, не дольше, чем этого требуют цели обработки персональных данных, если срок хранения персональных данных не установлен федеральным законом или договором.
8.8. Условием прекращения обработки персональных данных может являться достижение целей обработки персональных данных, истечение срока действия согласия субъекта персональных данных, отзыв согласия субъектом персональных данных или требование о прекращении обработки персональных данных, а также выявление неправомерной обработки персональных данных.

9. ПЕРЕЧЕНЬ ДЕЙСТВИЙ, ПРОИЗВОДИМЫХ ОПЕРАТОРОМ С ПОЛУЧЕННЫМИ ПЕРСОНАЛЬНЫМИ ДАННЫМИ
9.1. Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление и уничтожение персональных данных.
9.2. Оператор осуществляет автоматизированную обработку персональных данных с получением и/или передачей полученной информации по информационно-телекоммуникационным сетям.

10. ТРАНСГРАНИЧНАЯ ПЕРЕДАЧА ПЕРСОНАЛЬНЫХ ДАННЫХ
10.1. Оператор до начала осуществления деятельности по трансграничной передаче персональных данных обязан уведомить уполномоченный орган по защите прав субъектов персональных данных о своем намерении осуществлять трансграничную передачу персональных данных.
10.2. Оператор до подачи вышеуказанного уведомления обязан получить от органов власти иностранного государства, иностранных физических лиц, иностранных юридических лиц, которым планируется трансграничная передача персональных данных, соответствующие сведения.

11. КОНФИДЕНЦИАЛЬНОСТЬ ПЕРСОНАЛЬНЫХ ДАННЫХ
Оператор и иные лица, получившие доступ к персональным данным, обязаны не раскрывать третьим лицам и не распространять персональные данные без согласия субъекта персональных данных, если иное не предусмотрено федеральным законом.

12. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
12.1. Пользователь может получить любые разъяснения по интересующим вопросам, касающимся обработки его персональных данных, обратившись к Оператору с помощью электронной почты bystrobarista@gmail.com.
12.2. В данном документе будут отражены любые изменения политики обработки персональных данных Оператором. Политика действует бессрочно до замены её новой версией.
12.3. Актуальная версия Политики в свободном доступе расположена в Приложении в разделе Настройки → О приложении, а также в сети Интернет по адресу https://bystrobarista.com/privacy-policy/.`;

const BODY_EN = `Effective date: 12 June 2026.

1. GENERAL PROVISIONS
This Personal Data Processing Policy ("Policy") is drafted in accordance with Federal Law No. 152-FZ of 27 July 2006 "On Personal Data" ("Personal Data Law") and defines the procedure for processing personal data and the security measures taken by Daniil Davidovich Khait ("Operator").
1.1. The Operator's top priority is to respect human and civil rights and freedoms when processing personal data, including the right to privacy and the protection of personal and family secrets.
1.2. This Policy applies to all information that the Operator may obtain about users of the BystroBarista mobile application ("App") and the associated website bystrobarista.com.

2. KEY TERMS
2.1. Automated processing of personal data — processing of personal data by means of computing devices.
2.2. Blocking of personal data — temporary suspension of personal data processing (except where processing is necessary to clarify the data).
2.3. App — the BystroBarista computer program for matching coffee-industry staff, available for installation on Users' mobile devices through app stores.
2.4. Personal data information system — a set of personal data contained in databases and the information technology and technical means that process them.
2.5. Depersonalization of personal data — actions that make it impossible, without the use of additional information, to attribute personal data to a specific User or other data subject.
2.6. Processing of personal data — any action (operation) or set of actions (operations) performed with personal data, with or without the use of automation, including collection, recording, systematization, accumulation, storage, clarification, retrieval, use, transfer, depersonalization, blocking, deletion, destruction.
2.7. Operator — a state body, municipal body, legal entity, or individual that, alone or jointly with others, organizes and/or carries out the processing of personal data and determines the purposes, composition, and operations of such processing.
2.8. Personal data — any information that relates directly or indirectly to an identified or identifiable User of the App.
2.9. User — any natural person who uses the App, including a person who has registered an account in the "barista" or "business" role.
2.10. Providing personal data — actions aimed at disclosing personal data to a specific person or a defined group of persons.
2.11. Distribution of personal data — any actions aimed at disclosing personal data to an undefined group of persons.
2.12. Cross-border transfer of personal data — transfer of personal data to the territory of a foreign state, to a foreign authority, foreign natural person, or foreign legal entity.
2.13. Destruction of personal data — any actions that result in the irreversible destruction of personal data with no possibility of recovering its content.

3. KEY RIGHTS AND OBLIGATIONS OF THE OPERATOR
3.1. The Operator has the right to:
— receive accurate information and/or documents containing personal data from the data subject;
— in the event of withdrawal of consent, continue processing personal data without consent where grounds set out in the Personal Data Law apply;
— independently determine the scope of measures necessary to comply with the Personal Data Law.
3.2. The Operator is obliged to:
— provide the data subject, upon request, with information regarding the processing of their personal data;
— organize the processing of personal data in accordance with the laws of the Russian Federation;
— respond to requests from data subjects and their legal representatives in accordance with the Personal Data Law;
— provide information to the authorized body for the protection of data subjects' rights (Roskomnadzor) within 10 days of receiving a request;
— publish or otherwise ensure unrestricted access to this Policy;
— take legal, organizational, and technical measures to protect personal data from unauthorized or accidental access, destruction, modification, blocking, copying, provision, distribution, or other unlawful actions;
— cease the transfer, processing, and destroy personal data in the manner and cases provided for by the Personal Data Law;
— fulfill other obligations provided for by the Personal Data Law.

4. KEY RIGHTS AND OBLIGATIONS OF DATA SUBJECTS
4.1. Data subjects have the right to:
— obtain information regarding the processing of their personal data, except as provided by federal law;
— request the Operator to clarify, block, or destroy their personal data if it is incomplete, outdated, inaccurate, unlawfully obtained, or no longer necessary for the stated purpose of processing;
— withdraw consent to the processing of personal data and to send a request to stop processing;
— file a complaint with the authorized body (Roskomnadzor) or in court against unlawful actions or inaction of the Operator;
— exercise other rights provided for by the laws of the Russian Federation.
4.2. Data subjects must:
— provide the Operator with accurate information about themselves;
— inform the Operator about updates or changes to their personal data.
4.3. Persons who provide the Operator with false information about themselves, or information about another data subject without that subject's consent, bear responsibility under the laws of the Russian Federation.

5. PRINCIPLES OF PROCESSING
5.1. Personal data is processed on a lawful and fair basis.
5.2. Processing is limited to achieving specific, predefined, and lawful purposes. Processing incompatible with the purposes of collection is not permitted.
5.3. Merging databases containing personal data processed for incompatible purposes is not permitted.
5.4. Only personal data that meets the purposes of processing is subject to processing.
5.5. The content and volume of processed personal data correspond to the stated purposes. Excessive personal data relative to the stated purposes is not permitted.
5.6. The accuracy, sufficiency, and, where necessary, relevance of personal data are ensured.
5.7. Personal data is stored in a form that allows identification of the subject no longer than required by the purposes of processing, unless a longer term is set by federal law or contract.

6. PURPOSES AND COMPOSITION OF PROCESSED DATA
6.1. Purposes:
— User registration and authentication in the App;
— matching vacancies and candidates and enabling communication (applications, chats, shift coordination);
— security of the Service, fraud and abuse prevention;
— review of complaints and moderation decisions;
— delivery of functional push notifications (new message, application, shift status); promotional notifications are not sent;
— compliance with the laws of the Russian Federation.
6.2. Composition of processed personal data:
— email address, name, selected role (barista / business), password (stored hashed);
— profile data: photo, work experience, skills, schedule preferences; for businesses — venue name, address, photos, tax IDs (during verification);
— content of applications, chats, reviews, and complaints submitted in the App;
— approximate device coordinates (only while the App is in use and only with the User's consent);
— technical data: device identifier, OS version, crash logs, push token;
— when signing in via third-party providers (Apple, Google, Yandex) — the account identifier and email address provided by the provider.
6.3. Legal grounds: Federal Law No. 152-FZ of 27 July 2006 "On Personal Data"; Federal Law No. 149-FZ of 27 July 2006 "On Information, Information Technologies and Information Protection"; the data subject's consent; a contract with the data subject (the App's Terms of Service).
6.4. Special categories of personal data (race, ethnicity, political views, religious or philosophical beliefs, health, intimate life) are not requested or processed by the Operator.

7. CONDITIONS OF PROCESSING
7.1. Personal data is processed with the data subject's consent.
7.2. Processing is necessary to achieve purposes provided for by an international treaty of the Russian Federation or by law.
7.3. Processing is necessary to perform a contract to which the data subject is a party or beneficiary, or to enter into a contract at the initiative of the data subject.
7.4. Processing is necessary to exercise the rights and lawful interests of the Operator or third parties, provided that this does not violate the rights and freedoms of the data subject.
7.5. Processing of personal data to which the subject has granted access to an unlimited number of persons is carried out.
7.6. Processing of personal data subject to mandatory publication or disclosure in accordance with federal law is carried out.

8. PROCEDURES FOR COLLECTION, STORAGE, TRANSFER, AND OTHER PROCESSING
The security of personal data processed by the Operator is ensured through legal, organizational, and technical measures necessary to comply in full with the requirements of applicable data protection law.
8.1. The Operator ensures the safety of personal data and takes all possible measures to prevent access by unauthorized persons. Data is transmitted over a secure channel (TLS) and stored in encrypted form.
8.2. The User's personal data will not be transferred to third parties except:
— transfer to the cloud infrastructure provider (Supabase Inc.) for storage and processing;
— transfer to sign-in providers (Apple, Google, Yandex) when the User uses the corresponding sign-in method;
— transfer to Apple Push Notification Service for push delivery;
— transfer to government authorities upon lawful request;
— cases in which the data subject has given a separate consent to transfer data to a third party.
The Operator does not sell personal data and does not transfer it for advertising purposes.
8.3. If inaccuracies are found in personal data, the User can update them independently in the App (Profile section) or by sending the Operator a notice at bystrobarista@gmail.com marked "Update of personal data".
8.4. The term of personal data processing is determined by the achievement of the purposes for which the personal data was collected, unless a different term is set by contract or by applicable law. The User may at any time withdraw consent to the processing of personal data by sending a notice to bystrobarista@gmail.com marked "Withdrawal of consent to personal data processing", or by deleting the account in Settings → Delete account. After account deletion, personal data is removed within 30 days, except for data that the Operator is legally required to retain.
8.5. All information collected by third-party services, including payment systems, communication tools, and other service providers, is stored and processed by those persons (Operators) in accordance with their User Agreements and Privacy Policies. The Operator is not responsible for the actions of third parties, including the service providers mentioned in this clause.
8.6. The Operator ensures the confidentiality of personal data during processing.
8.7. The Operator stores personal data in a form that allows identification of the subject no longer than required by the purposes of processing, unless the retention period is set by federal law or contract.
8.8. Conditions for termination of processing may include achievement of the purposes, expiration of the data subject's consent, withdrawal of consent or a request to cease processing, as well as detection of unlawful processing.

9. LIST OF OPERATIONS PERFORMED BY THE OPERATOR
9.1. The Operator performs collection, recording, systematization, accumulation, storage, clarification, retrieval, use, transfer, depersonalization, blocking, deletion, and destruction of personal data.
9.2. The Operator performs automated processing of personal data with the receipt and/or transfer of the information via information and telecommunications networks.

10. CROSS-BORDER TRANSFER OF PERSONAL DATA
10.1. Before commencing cross-border transfer of personal data, the Operator is required to notify the authorized body for the protection of data subjects' rights of its intent to carry out such transfers.
10.2. Before submitting the above notification, the Operator is required to obtain the relevant information from the foreign authorities, foreign natural persons, or foreign legal entities to whom cross-border transfer of personal data is planned.

11. CONFIDENTIALITY OF PERSONAL DATA
The Operator and other persons who have gained access to personal data are required not to disclose personal data to third parties and not to distribute it without the data subject's consent, unless otherwise provided by federal law.

12. FINAL PROVISIONS
12.1. The User may obtain any clarifications on issues concerning the processing of personal data by contacting the Operator at bystrobarista@gmail.com.
12.2. Any changes to the Operator's personal data processing policy will be reflected in this document. The Policy is valid indefinitely until it is replaced by a new version.
12.3. The current version of the Policy is freely available in the App in Settings → About, and on the Internet at https://bystrobarista.com/privacy-policy/.`;

export const PersonalDataPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.legal.personalDataPolicyTitle') });
  }, [navigation, t]);

  const body = getCurrentLanguage() === 'ru' ? BODY_RU : BODY_EN;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.legal.personalDataPolicyTitle')}</Text>
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
