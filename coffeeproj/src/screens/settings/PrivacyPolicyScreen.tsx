import React, { useLayoutEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { getCurrentLanguage } from '../../i18n';

const BODY_RU = `Дата публикации: 12 июня 2026 г.

Текущая версия доступна по адресу: https://bystrobarista.com/privacy/.

1. ЧТО РЕГУЛИРУЕТ НАСТОЯЩАЯ ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

Настоящая политика конфиденциальности (далее — Политика) действует в отношении всей информации, включая персональные данные в понимании Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — «Персональная информация»), которую оператор может получить о Вас в процессе использования Вами мобильного приложения «БыстроБариста» (далее — «Приложение») и связанного с ним сайта bystrobarista.com (далее вместе — «Сервис»). Политика также распространяется на исполнение соглашений и договоров, заключённых между Вами и оператором в связи с использованием Вами Сервиса.

Пожалуйста, обратите внимание, что использование отдельных функций Сервиса может регулироваться дополнительными условиями (например, Условиями использования или Согласием на обработку персональных данных), которые могут содержать специальные условия в отношении Персональной информации и которые размещены в соответствующих разделах Сервиса.

2. КТО ОБРАБАТЫВАЕТ ИНФОРМАЦИЮ

Для обеспечения использования Вами Сервиса Ваша Персональная информация собирается и обрабатывается оператором — Хаитом Даниилом Давидовичем, физическим лицом, действующим в соответствии с законодательством Российской Федерации (далее — «Оператор»).

Направить обращение лицу, ответственному за организацию обработки персональных данных, можно по адресу электронной почты: bystrobarista@gmail.com.

3. КАКОВА ЦЕЛЬ ДАННОЙ ПОЛИТИКИ

Защита Вашей Персональной информации и Вашей конфиденциальности чрезвычайно важна для Оператора. Поэтому при использовании Вами Сервиса Оператор обрабатывает Вашу Персональную информацию в строгом соответствии с применимым законодательством.

Следуя обязанностям защищать Вашу Персональную информацию, в этой Политике мы хотим максимально прозрачно проинформировать Вас:
(a) зачем и как Оператор собирает и использует («обрабатывает») Вашу Персональную информацию, когда Вы используете Сервис;
(b) каковы роль и обязанности Оператора как лица, принимающего решение о том, зачем и как обрабатывать Вашу Персональную информацию;
(c) какие инструменты Вы можете использовать для сокращения объёма собираемой Оператором Персональной информации о Вас;
(d) каковы Ваши права в рамках проводимой обработки Персональной информации.

4. КАКУЮ ПЕРСОНАЛЬНУЮ ИНФОРМАЦИЮ О ВАС СОБИРАЕТ ОПЕРАТОР

Персональная информация, собранная в процессе работы Сервиса, различается в зависимости от того, используете ли Вы для доступа к нему свою учётную запись или нет. В тех случаях, когда Вы осуществляете вход в свою учётную запись, собранная о Вас Оператором Персональная информация может быть сопоставлена с другой Персональной информацией, предоставленной Вами при создании или использовании учётной записи (например, имя, контактные данные).

Вы не обязаны предоставлять Оператору Персональную информацию, за исключением случаев, предусмотренных Пользовательским соглашением Сервиса или условиями отдельных функций. Тем не менее, Вы обязуетесь предоставлять достоверную и достаточную Персональную информацию, а также своевременно обновлять её.

Оператор может собирать следующие категории Персональной информации о Вас во время использования Вами Сервиса:

(i) Персональная информация, предоставленная Вами при регистрации (создании учётной записи), такая как Ваше имя, адрес электронной почты, выбранная роль (бариста / бизнес), пароль (хранится в зашифрованном виде);
(ii) данные профиля: фотография, опыт работы, навыки, предпочтения по графику; для бизнес-аккаунтов — название заведения, адрес, фотографии заведения, ИНН/ОГРН (при верификации);
(iii) контент, создаваемый Вами при использовании Сервиса: вакансии, отклики, сообщения в чатах, отзывы, жалобы и связанные с ними материалы;
(iv) приблизительные данные о геолокации (только во время использования Приложения и только при наличии Вашего отдельного согласия, предоставленного через системные настройки устройства);
(v) технические данные: идентификатор устройства, версия операционной системы, журналы сбоев, push-токен для отправки уведомлений, дата и время доступа к Сервису, IP-адрес;
(vi) Персональная информация, полученная от сторонних провайдеров входа (Apple, Google, Яндекс), при выборе Вами соответствующего способа авторизации: идентификатор аккаунта и адрес электронной почты, предоставленный провайдером;
(vii) иная информация о Вас, необходимая для обработки в соответствии с условиями, регулирующими использование конкретных функций Сервиса.

Оператор целенаправленно не собирает чувствительную персональную информацию (такую как расовое происхождение, политические взгляды, информацию о состоянии здоровья и иные категории). Тем не менее Вы можете самостоятельно предоставить такую информацию в открытом тексте (например, в чатах или жалобах), и в этом случае Оператор будет вынужден её обработать в рамках предоставления Сервиса. Оператор не может запросить Ваше отдельное согласие на такую обработку, поскольку не осведомлён заранее о потенциально чувствительном характере Персональной информации, которую Вы решите предоставить.

Оператор не собирает данные с целью составления «портрета» пользователя в той степени, при которой это может существенно повлиять на Ваши права в соответствии с применимым законодательством.

5. КАКОВА ПРАВОВАЯ ОСНОВА И ЦЕЛИ ОБРАБОТКИ ВАШЕЙ ПЕРСОНАЛЬНОЙ ИНФОРМАЦИИ

Оператор не вправе обрабатывать Вашу Персональную информацию без достаточных на то правовых оснований. Поэтому Оператор обрабатывает Вашу Персональную информацию только в случае, если:

(i) обработка необходима для выполнения договоров между Вами и Оператором, таких как Условия использования Сервиса, что также включает обеспечение работы Сервиса (например, поиск релевантных вакансий, доставка сообщений между Вами и другими пользователями);
(ii) обработка необходима для соблюдения установленных законодательством обязательств;
(iii) когда это предусмотрено применимым законодательством, обработка необходима для обеспечения законных интересов Оператора в случае, если такая обработка не влияет на Ваши интересы, фундаментальные права и свободы. К таким законным интересам относятся: понимание того, как Вы взаимодействуете с Сервисом; совершенствование, изменение и улучшение Сервиса в интересах всех пользователей; защита прав Оператора и других пользователей; борьба с мошенничеством, спамом и нарушениями правил Сервиса;
(iv) для конкретных целей либо в соответствии с требованием применимого законодательства Оператор может запросить Ваше отдельное согласие на обработку Персональной информации, в том числе посредством отметки на экране регистрации в Приложении.

Оператор обрабатывает Вашу Персональную информацию для следующих целей:

(i) предоставление Вам доступа к Сервису (в том числе подбор вакансий по Вашему запросу с учётом Персональной информации о Вас, доступной Оператору);
(ii) предоставление доступа к Вашей учётной записи, включая хранение профиля, истории откликов и сообщений;
(iii) осуществление связи с Вами для направления Вам уведомлений, запросов и информации, относящейся к работе Сервиса (например, новое сообщение, отклик на вакансию, изменение статуса смены); рекламные уведомления не отправляются;
(iv) повышение удобства использования Сервиса, в том числе для показа наиболее релевантных вакансий и кандидатов;
(v) защита Ваших прав и прав Оператора, рассмотрение жалоб и принятие модераторских решений;
(vi) сбор, обработка и представление статистических данных и иных исследований в обезличенной форме;
(vii) выявление угроз безопасности для Сервиса, пользователей, Оператора и/или третьих лиц, в том числе проверка Вашей благонадёжности при использовании Сервиса.

Информируем Вас, а Вы подтверждаете, что у Вас нет никаких обязательств по предоставлению Оператору какой-либо Персональной информации при использовании Вами Сервиса, и её предоставление основано исключительно на Вашей свободной воле. Вместе с тем Вы осознаёте, что без предоставления Персональной информации невозможно воспользоваться частью функций Сервиса.

6. КАК ОПЕРАТОР ЗАЩИЩАЕТ ВАШУ ПЕРСОНАЛЬНУЮ ИНФОРМАЦИЮ

В большинстве случаев Персональная информация обрабатывается автоматически без доступа к ней кого-либо из лиц, действующих на стороне Оператора. В случае если такой доступ потребуется, он будет предоставлен только тем лицам, которые нуждаются в этом для выполнения своих задач. Для защиты и обеспечения конфиденциальности Персональной информации все указанные лица обязаны соблюдать внутренние правила и процедуры в отношении обработки Персональной информации.

Оператор внедрил достаточные технические и организационные меры для защиты Персональной информации от несанкционированного, случайного или незаконного уничтожения, потери, изменения, недобросовестного использования, раскрытия или доступа, а также иных незаконных форм обработки. Данные меры безопасности были реализованы с учётом современного уровня техники, стоимости их реализации, рисков, связанных с обработкой, и характера Персональной информации.

В частности, Персональная информация передаётся между Вашим устройством и серверами Оператора по защищённому каналу связи (TLS), а в базах данных хранится в зашифрованном виде. Пароли хранятся исключительно в виде криптографических хэшей и не доступны Оператору в исходном виде.

7. КТО ЕЩЁ ИМЕЕТ ДОСТУП К ВАШЕЙ ПЕРСОНАЛЬНОЙ ИНФОРМАЦИИ И КОМУ ОНА МОЖЕТ БЫТЬ ПЕРЕДАНА

7.1. Подрядчики и поставщики услуг

Оператор может передавать Вашу Персональную информацию третьим лицам, оказывающим Оператору услуги, необходимые для работы Сервиса, исключительно в объёме, необходимом для оказания таких услуг, и только для целей, изложенных в разделе 5 настоящей Политики. К таким третьим лицам относятся:

(i) поставщик облачной инфраструктуры — Supabase Inc. (хранение и обработка данных Сервиса);
(ii) провайдеры входа — Apple Inc., Google LLC, ООО «ЯНДЕКС» — при использовании Вами соответствующего способа авторизации;
(iii) Apple Push Notification Service — для доставки push-уведомлений на Ваше устройство;
(iv) лица, участвующие в выявлении угроз безопасности для Сервиса, пользователей, Оператора и/или третьих лиц.

7.2. Иные случаи передачи

Оператор также может передавать Персональную информацию третьим лицам в следующих случаях:

(i) любому национальному и/или международному регулирующему органу, правоохранительным органам, центральным или местным исполнительным государственным органам или судам, в отношении которых Оператор обязан предоставлять информацию в соответствии с применимым законодательством, по их обоснованному запросу;
(ii) третьим лицам в случае, если Вы выразили согласие на передачу Вашей Персональной информации либо передача Персональной информации требуется для предоставления Вам соответствующей функции Сервиса или выполнения определённого соглашения или договора, заключённого с Вами;
(iii) любому третьему лицу в целях обеспечения правовой защиты Оператора или третьих лиц при нарушении Вами Условий использования Сервиса, настоящей Политики или Согласия на обработку персональных данных, либо в ситуации, когда существует угроза такого нарушения.

Оператор не продаёт Вашу Персональную информацию и не передаёт её в рекламных целях.

7.3. Для российских пользователей

Оператор осуществляет запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение Персональной информации граждан Российской Федерации с использованием баз данных, находящихся на территории Российской Федерации, как этого требует Федеральный закон № 152-ФЗ.

Часть указанных в разделе 7.1 поставщиков услуг (например, Supabase Inc., Apple Inc., Google LLC) находятся за пределами территории Российской Федерации. Передача им Персональной информации осуществляется только после выполнения формальностей, предусмотренных применимым законодательством, и только в объёме, необходимом для оказания соответствующих услуг.

8. КАК ДОЛГО ОПЕРАТОР ХРАНИТ ВАШУ ПЕРСОНАЛЬНУЮ ИНФОРМАЦИЮ

Оператор хранит Вашу Персональную информацию столько времени, сколько это необходимо для достижения цели, для которой она была собрана, либо для соблюдения требований применимого законодательства и нормативных актов.

Если иное не требуется по закону или соглашению с Вами, контент и сообщения, которые Вы создаёте в Сервисе как часть Вашей учётной записи, хранятся в течение срока действия учётной записи, но они могут быть удалены Вами в любое время.

Если Вы хотите, чтобы какая-либо Ваша Персональная информация была удалена из баз данных Оператора, Вы можете самостоятельно удалить её через интерфейс Сервиса (где это применимо) либо удалить учётную запись в разделе Настройки → Удалить аккаунт. После удаления учётной записи Персональная информация удаляется в течение 30 (тридцати) дней, за исключением сведений, которые Оператор обязан хранить по закону (например, для разрешения споров или налогового учёта).

9. ВАШИ ПРАВА

9.1. Какими правами Вы обладаете

В случае если это предусмотрено применимым законодательством, Вы имеете право на доступ к Вашей Персональной информации, обрабатываемой Оператором в соответствии с настоящей Политикой.

Если Вы считаете, что какая-либо информация, которую Оператор хранит о Вас, некорректная или неполная, Вы можете войти в свою учётную запись и самостоятельно её скорректировать через раздел «Профиль».

Если это предусмотрено применимым законодательством, Вы имеете право:
— ознакомиться с информацией, которую Оператор хранит о Вас, в том числе посредством Вашей учётной записи;
— требовать удаления Вашей Персональной информации или её части, а также отзывать согласие на обработку Вашей Персональной информации;
— требовать ограничений на обработку Вашей Персональной информации;
— возражать против обработки Вашей Персональной информации, если это предусмотрено применимым законодательством;
— подать жалобу в компетентный орган (в Российской Федерации — Роскомнадзор).

Оператор будет выполнять указанные запросы в соответствии с применимым законодательством.

В случаях, предусмотренных применимым законодательством, Вы можете также обладать другими правами, не указанными выше.

При использовании Вами Сервиса передача Персональной информации осуществляется с Вашего согласия, выражающего свободную волю и Ваше осознанное решение, и не является обязанностью по закону.

9.2. Как Вы можете реализовать свои права

Для осуществления вышеперечисленных прав, пожалуйста, войдите в свою учётную запись и воспользуйтесь функциями интерфейса Сервиса (раздел «Профиль», Настройки → Удалить аккаунт), а в случае отсутствия специальной функции в интерфейсе свяжитесь с Оператором по адресу электронной почты bystrobarista@gmail.com.

Если Вы не удовлетворены тем, как Оператор обрабатывает Вашу Персональную информацию, пожалуйста, сообщите Оператору, и Оператор рассмотрит Вашу претензию. Если Вы считаете, что Ваши права в отношении обработки Персональной информации нарушены Оператором, Вы имеете право подать жалобу в компетентный орган.

10. КАК ОПЕРАТОР ИСПОЛЬЗУЕТ ИДЕНТИФИКАТОРЫ И ХРАНИЛИЩА УСТРОЙСТВА

10.1. Какие идентификаторы и хранилища использует Оператор

Поскольку Приложение является мобильным, Оператор не использует веб-cookie в традиционном понимании. Однако Приложение использует ряд технологий, выполняющих аналогичные функции:

(i) защищённое хранилище устройства (iOS Keychain) — для хранения токенов сессии, обеспечивающих сохранение Вашего входа в учётную запись между запусками Приложения;
(ii) локальное хранилище Приложения — для хранения настроек интерфейса (язык, выбор фильтров), кэша вакансий и других данных, необходимых для работы Приложения в офлайн-режиме;
(iii) push-токен Apple Push Notification Service — для адресации push-уведомлений на конкретное устройство;
(iv) идентификатор устройства и версия операционной системы — для диагностики сбоев и обеспечения совместимости.

10.2. Как долго эти данные хранятся

Оператор использует указанные технологии в указанных выше целях. Токены сессии хранятся до выхода из учётной записи или до их истечения. Push-токен хранится до удаления Приложения с устройства. Локальные данные хранятся до удаления Приложения либо до очистки кэша вручную.

10.3. Кто ещё имеет доступ к этой информации

Push-токены передаются Apple Push Notification Service для доставки уведомлений. Информация о сбоях может передаваться в обезличенном виде Оператору для диагностики проблем. Доступ третьих лиц к содержимому защищённого хранилища устройства ограничен средствами операционной системы.

Вы можете в любой момент выйти из учётной записи в разделе Настройки, что приведёт к удалению токенов сессии с устройства. Удаление Приложения с устройства приводит к удалению всех локально хранимых данных.

11. ОБНОВЛЕНИЕ НАСТОЯЩЕЙ ПОЛИТИКИ

В настоящую Политику могут быть внесены изменения. Оператор имеет право вносить изменения по своему усмотрению, в том числе, но не ограничиваясь, в случаях, когда соответствующие изменения связаны с изменениями в применимом законодательстве, а также когда соответствующие изменения связаны с изменениями в работе Сервиса.

Оператор обязуется не вносить существенных изменений, не налагать дополнительных обременений или ограничений Ваших прав, установленных настоящей Политикой, без Вашего уведомления. Вы будете уведомлены о таких изменениях. Соответствующие уведомления могут быть отображены в Сервисе (например, через всплывающее окно) до момента, когда изменения вступят в силу, или могут быть отправлены Вам по другим каналам связи (например, по электронной почте, если Вы предоставили её Оператору).

12. ВОПРОСЫ И ПРЕДЛОЖЕНИЯ

Оператор приветствует Ваши вопросы и предложения, касающиеся исполнения или изменения настоящей Политики. Пожалуйста, воспользуйтесь адресом электронной почты bystrobarista@gmail.com. Вы также можете воспользоваться этим адресом для направления запросов о реализации Ваших прав или жалоб относительно обработки Персональной информации или незаконности её обработки.`;

const BODY_EN = `Publication date: 12 June 2026.

The current version is available at: https://bystrobarista.com/privacy/.

1. WHAT THIS PRIVACY POLICY REGULATES

This Privacy Policy ("Policy") applies to all information, including personal data within the meaning of Federal Law No. 152-FZ of 27 July 2006 "On Personal Data" (the "Personal Information"), that the Operator may obtain about You during Your use of the BystroBarista mobile application (the "App") and the associated website bystrobarista.com (together, the "Service"). The Policy also applies to the performance of agreements and contracts entered into between You and the Operator in connection with Your use of the Service.

Please note that use of individual features of the Service may be regulated by additional terms (for example, the Terms of Service or the Consent to Personal Data Processing), which may contain special provisions regarding Personal Information and which are posted in the corresponding sections of the Service.

2. WHO PROCESSES THE INFORMATION

To enable Your use of the Service, Your Personal Information is collected and processed by the Operator — Daniil Davidovich Khait, a natural person acting in accordance with the laws of the Russian Federation (the "Operator").

You may send an inquiry to the person responsible for organizing the processing of personal data at: bystrobarista@gmail.com.

3. PURPOSE OF THIS POLICY

The protection of Your Personal Information and Your privacy is extremely important to the Operator. Therefore, when You use the Service, the Operator processes Your Personal Information in strict accordance with applicable law.

In keeping with the obligation to protect Your Personal Information, this Policy informs You as transparently as possible about:
(a) why and how the Operator collects and uses ("processes") Your Personal Information when You use the Service;
(b) the role and obligations of the Operator as the entity that decides why and how to process Your Personal Information;
(c) what tools You can use to reduce the amount of Personal Information the Operator collects about You;
(d) Your rights in connection with the processing of Personal Information.

4. WHAT PERSONAL INFORMATION THE OPERATOR COLLECTS ABOUT YOU

The Personal Information collected during the operation of the Service varies depending on whether You access it through Your account or not. When You sign in to Your account, the Personal Information collected about You by the Operator may be combined with other Personal Information You provided when creating or using Your account (for example, name, contact details).

You are not obligated to provide the Operator with Personal Information, except in cases provided for by the Service's Terms of Use or the terms of individual features. However, You undertake to provide accurate and sufficient Personal Information and to update it in a timely manner.

The Operator may collect the following categories of Personal Information about You while You use the Service:

(i) Personal Information provided by You upon registration (creation of an account), such as Your name, email address, selected role (barista / business), and password (stored hashed);
(ii) profile data: photo, work experience, skills, schedule preferences; for business accounts — venue name, address, venue photos, tax IDs (during verification);
(iii) content created by You while using the Service: vacancies, applications, chat messages, reviews, complaints, and related materials;
(iv) approximate location data (only while the App is in use and only with Your separate consent given through the device's system settings);
(v) technical data: device identifier, OS version, crash logs, push token for notifications, date and time of access to the Service, IP address;
(vi) Personal Information received from third-party sign-in providers (Apple, Google, Yandex) when You choose the corresponding sign-in method: the account identifier and email address provided by the provider;
(vii) other information about You necessary for processing in accordance with the terms governing the use of specific features of the Service.

The Operator does not deliberately collect sensitive personal information (such as racial origin, political views, health information, and other categories). However, You may voluntarily provide such information in free-form text (for example, in chats or complaints), in which case the Operator will have to process it as part of providing the Service. The Operator cannot ask for Your separate consent for such processing because it is not aware in advance of the potentially sensitive nature of the Personal Information You choose to provide.

The Operator does not collect data for the purpose of building a user "profile" to an extent that may materially affect Your rights under applicable law.

5. LEGAL BASIS AND PURPOSES OF PROCESSING YOUR PERSONAL INFORMATION

The Operator is not entitled to process Your Personal Information without sufficient legal grounds. Therefore, the Operator processes Your Personal Information only if:

(i) processing is necessary to perform agreements between You and the Operator, such as the Service's Terms of Use, which also includes ensuring the operation of the Service (for example, surfacing relevant vacancies, delivering messages between You and other users);
(ii) processing is necessary to comply with legal obligations;
(iii) where permitted by applicable law, processing is necessary to support the Operator's legitimate interests, provided that such processing does not affect Your interests, fundamental rights, and freedoms. Such legitimate interests include: understanding how You interact with the Service; improving, changing, and enhancing the Service for the benefit of all users; protecting the rights of the Operator and other users; combating fraud, spam, and violations of the Service's rules;
(iv) for specific purposes, or as required by applicable law, the Operator may request Your separate consent to process Personal Information, including via a checkbox on the sign-up screen in the App.

The Operator processes Your Personal Information for the following purposes:

(i) providing You access to the Service (including matching vacancies to Your queries based on the Personal Information about You available to the Operator);
(ii) providing access to Your account, including storage of Your profile, application history, and messages;
(iii) communicating with You to send notifications, requests, and information related to the operation of the Service (for example, new message, job application, shift status change); promotional notifications are not sent;
(iv) improving the convenience of using the Service, including showing the most relevant vacancies and candidates;
(v) protecting Your rights and the rights of the Operator, reviewing complaints, and making moderation decisions;
(vi) collecting, processing, and presenting statistical data and other research in anonymized form;
(vii) detecting security threats to the Service, users, the Operator, and/or third parties, including verifying Your trustworthiness while using the Service.

We inform You, and You acknowledge, that You have no obligation to provide the Operator with any Personal Information when using the Service, and the provision of such information is based solely on Your free will. At the same time, You understand that without providing Personal Information You may not be able to use parts of the Service.

6. HOW THE OPERATOR PROTECTS YOUR PERSONAL INFORMATION

In most cases, Personal Information is processed automatically without access by any person acting on the Operator's behalf. Where such access is required, it is granted only to those persons who need it to perform their duties. To protect Personal Information and maintain its confidentiality, all such persons are required to comply with internal rules and procedures regarding the processing of Personal Information.

The Operator has implemented sufficient technical and organizational measures to protect Personal Information against unauthorized, accidental, or unlawful destruction, loss, alteration, misuse, disclosure, or access, as well as other unlawful forms of processing. These security measures were implemented taking into account the state of the art, the cost of implementation, the risks associated with processing, and the nature of the Personal Information.

In particular, Personal Information is transmitted between Your device and the Operator's servers over a secure channel (TLS), and is stored in encrypted form in databases. Passwords are stored only as cryptographic hashes and are not available to the Operator in plaintext.

7. WHO ELSE HAS ACCESS TO YOUR PERSONAL INFORMATION AND TO WHOM IT MAY BE TRANSFERRED

7.1. Contractors and service providers

The Operator may transfer Your Personal Information to third parties providing the Operator with services necessary for the operation of the Service, solely to the extent necessary to provide such services, and only for the purposes set out in section 5 of this Policy. Such third parties include:

(i) the cloud infrastructure provider — Supabase Inc. (storage and processing of Service data);
(ii) sign-in providers — Apple Inc., Google LLC, Yandex LLC — when You use the corresponding sign-in method;
(iii) Apple Push Notification Service — for delivery of push notifications to Your device;
(iv) persons assisting in the detection of security threats to the Service, users, the Operator, and/or third parties.

7.2. Other cases of transfer

The Operator may also transfer Personal Information to third parties in the following cases:

(i) any national and/or international regulatory body, law enforcement authority, central or local government executive bodies, or courts to which the Operator is required to provide information in accordance with applicable law, upon their reasoned request;
(ii) third parties, where You have given consent to the transfer of Your Personal Information, or where the transfer of Personal Information is required to provide You with the relevant feature of the Service or to perform a specific agreement or contract entered into with You;
(iii) any third party for the purpose of ensuring the legal protection of the Operator or third parties in the event of Your violation of the Service's Terms of Use, this Policy, or the Consent to Personal Data Processing, or where a threat of such violation exists.

The Operator does not sell Your Personal Information and does not transfer it for advertising purposes.

7.3. For Russian users

The Operator carries out the recording, systematization, accumulation, storage, clarification (updating, modification), and retrieval of Personal Information of citizens of the Russian Federation using databases located on the territory of the Russian Federation, as required by Federal Law No. 152-FZ.

Some of the service providers listed in section 7.1 (for example, Supabase Inc., Apple Inc., Google LLC) are located outside the territory of the Russian Federation. Personal Information is transferred to them only after the formalities required by applicable law have been completed, and only to the extent necessary to provide the corresponding services.

8. HOW LONG THE OPERATOR STORES YOUR PERSONAL INFORMATION

The Operator stores Your Personal Information for as long as necessary to achieve the purpose for which it was collected or to comply with applicable laws and regulations.

Unless otherwise required by law or an agreement with You, the content and messages You create in the Service as part of Your account are stored for the duration of the account, but may be deleted by You at any time.

If You want any of Your Personal Information to be deleted from the Operator's databases, You can delete it Yourself through the Service interface (where applicable) or delete Your account in Settings → Delete account. After deleting the account, Personal Information is removed within 30 (thirty) days, except for data that the Operator is legally required to retain (for example, for dispute resolution or tax accounting).

9. YOUR RIGHTS

9.1. What rights You have

Where provided by applicable law, You have the right to access Your Personal Information processed by the Operator in accordance with this Policy.

If You believe that any information the Operator stores about You is incorrect or incomplete, You can sign in to Your account and correct it Yourself in the "Profile" section.

Where provided by applicable law, You have the right to:
— review the information the Operator stores about You, including through Your account;
— request the deletion of Your Personal Information or part of it, and to withdraw consent to the processing of Your Personal Information;
— request restrictions on the processing of Your Personal Information;
— object to the processing of Your Personal Information, where provided by applicable law;
— file a complaint with the competent authority (in the Russian Federation — Roskomnadzor).

The Operator will fulfill such requests in accordance with applicable law.

In cases provided for by applicable law, You may also have other rights not listed above.

When You use the Service, the transfer of Personal Information takes place with Your consent, expressing Your free will and informed decision, and is not a legal obligation.

9.2. How You can exercise Your rights

To exercise the above rights, please sign in to Your account and use the Service's interface features (the "Profile" section, Settings → Delete account); in the absence of a specific feature in the interface, contact the Operator at bystrobarista@gmail.com.

If You are not satisfied with how the Operator processes Your Personal Information, please notify the Operator, and the Operator will review Your complaint. If You believe that Your rights regarding the processing of Personal Information have been violated by the Operator, You have the right to file a complaint with the competent authority.

10. HOW THE OPERATOR USES DEVICE IDENTIFIERS AND STORAGE

10.1. What identifiers and storage the Operator uses

Since the App is a mobile application, the Operator does not use web cookies in the traditional sense. However, the App uses a number of technologies that serve a similar purpose:

(i) the device's secure storage (iOS Keychain) — to store session tokens that keep You signed in across launches of the App;
(ii) the App's local storage — to store interface preferences (language, filter selections), cached vacancies, and other data needed for offline operation of the App;
(iii) the Apple Push Notification Service push token — to address push notifications to a specific device;
(iv) the device identifier and OS version — for crash diagnostics and compatibility.

10.2. How long this data is stored

The Operator uses these technologies for the purposes listed above. Session tokens are stored until You sign out of Your account or until they expire. The push token is stored until the App is removed from the device. Local data is stored until the App is removed, or until the cache is cleared manually.

10.3. Who else has access to this information

Push tokens are transmitted to Apple Push Notification Service for the delivery of notifications. Crash information may be sent to the Operator in anonymized form for diagnostic purposes. Third-party access to the contents of the device's secure storage is restricted by the operating system.

You can sign out of Your account in the Settings section at any time, which will remove session tokens from the device. Removing the App from the device deletes all locally stored data.

11. UPDATES TO THIS POLICY

This Policy may be updated. The Operator has the right to make changes at its discretion, including but not limited to cases where such changes are related to changes in applicable law, or where they are related to changes in the operation of the Service.

The Operator undertakes not to make material changes, nor to impose additional burdens or restrictions on Your rights as set out in this Policy, without notifying You. You will be notified of such changes. The corresponding notifications may be displayed in the Service (for example, via a pop-up window) before the changes take effect, or may be sent to You through other communication channels (for example, by email, if You have provided one to the Operator).

12. QUESTIONS AND SUGGESTIONS

The Operator welcomes Your questions and suggestions regarding the performance or modification of this Policy. Please use the email address bystrobarista@gmail.com. You can also use this address to send requests regarding the exercise of Your rights or complaints regarding the processing of Personal Information or the unlawfulness of its processing.`;

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
